from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

import os
import json
import shutil
import multiprocessing
import threading
import time
import uuid
from io import BytesIO 
from dotenv import load_dotenv
from pathlib import Path

from pymongo import MongoClient
from pymongo.errors import PyMongoError
import gridfs

_ENV_PATH = Path(__file__).with_name(".env")
# Load `backEnd/.env` regardless of the process working directory (common in dev).
# In containers, this file is typically not present and env vars are injected via the runtime.
load_dotenv(dotenv_path=_ENV_PATH, override=False)
load_dotenv(override=False)



app = Flask(__name__)


@app.before_request
def _request_id_before():
    rid = (request.headers.get("x-request-id") or "").strip()
    if not rid:
        rid = uuid.uuid4().hex
    g.request_id = rid

    if MEM_GUARD_MAX_RSS_BYTES:
        rss = _get_rss_bytes()
        if rss and rss > MEM_GUARD_MAX_RSS_BYTES:
            resp = jsonify(
                {
                    "error": "Server is under memory pressure. Please retry shortly.",
                    "stage": "mem_guard",
                    "rss_bytes": rss,
                    "max_rss_bytes": MEM_GUARD_MAX_RSS_BYTES,
                }
            )
            resp.status_code = 503
            resp.headers["Connection"] = "close"
            return resp


@app.after_request
def _request_id_after(resp):
    rid = getattr(g, "request_id", None)
    if rid:
        resp.headers["x-request-id"] = rid
    return resp

_MAX_UPLOAD_BYTES = os.getenv("MAX_UPLOAD_BYTES")
if _MAX_UPLOAD_BYTES:
    try:
        app.config["MAX_CONTENT_LENGTH"] = int(_MAX_UPLOAD_BYTES)
    except ValueError:
        pass


@app.errorhandler(RequestEntityTooLarge)
def _handle_file_too_large(err):
    limit = app.config.get("MAX_CONTENT_LENGTH")
    return jsonify({"error": "PDF too large", "max_upload_bytes": limit}), 413

def _parse_origins(value: str):
    return [o.strip() for o in (value or "").split(",") if o.strip()]

CORS(
    app,
    origins=_parse_origins(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081")),
)


MONGO_URI = (os.getenv("MONGO_URI") or "").strip() or None
PDF_MONGO_DB = (os.getenv("PDF_MONGO_DB") or "").strip() or None
PDF_GRIDFS_BUCKET = (os.getenv("PDF_GRIDFS_BUCKET") or "pdf_fs").strip() or "pdf_fs"
USE_MONGO = bool(MONGO_URI)

_MONGO_CLIENT = None
_MONGO_DB = None
_GRIDFS = None
_MONGO_INIT_LOCK = threading.Lock()
_MONGO_LAST_ERROR = None


def _mongo_db():
    global _MONGO_CLIENT, _MONGO_DB, _GRIDFS
    if not USE_MONGO:
        return None

    if _MONGO_DB is not None:
        return _MONGO_DB

    with _MONGO_INIT_LOCK:
        if _MONGO_DB is not None:
            return _MONGO_DB
        try:
            _MONGO_CLIENT = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000")),
                connectTimeoutMS=int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "8000")),
                retryWrites=True,
            )
            try:
                _MONGO_CLIENT.admin.command("ping")
            except Exception:
                # Ping may fail during cold start; queries will surface errors.
                pass

            try:
                db = _MONGO_CLIENT.get_default_database()
            except Exception:
                db = None

            if db is None:
                db_name = PDF_MONGO_DB or "brainlink"
                db = _MONGO_CLIENT[db_name]

            _MONGO_DB = db
            _GRIDFS = gridfs.GridFS(db, collection=PDF_GRIDFS_BUCKET)
            globals()["_MONGO_LAST_ERROR"] = None

            # Best-effort indexes (safe to ignore failures on free tiers). 
            try: 
                db["pdf_jobs"].create_index("job_id", unique=True) 
                db["pdf_jobs"].create_index("doc_id") 
                db["pdf_state"].create_index("key", unique=True) 
                db["pdf_docs"].create_index("doc_id", unique=True) 
                db["pdf_chunks"].create_index([("doc_id", 1), ("idx", 1)]) 
                db[f"{PDF_GRIDFS_BUCKET}.files"].create_index( 
                    [("metadata.doc_id", 1), ("metadata.kind", 1), ("metadata.ordinal", 1)] 
                ) 
            except Exception: 
                pass 

            return _MONGO_DB
        except Exception as e:
            globals()["_MONGO_LAST_ERROR"] = str(e)
            print(json.dumps({"type": "mongo_init_error", "error": str(e)}), flush=True)
            return None


def _jobs_col():
    db = _mongo_db()
    if db is None:
        return None
    return db["pdf_jobs"]


def _state_col():
    db = _mongo_db()
    if db is None:
        return None
    return db["pdf_state"]


def _grid_fs():
    _mongo_db()
    return _GRIDFS if USE_MONGO else None


_BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
_DATA_ROOT = os.getenv("DATA_ROOT", "").strip() or _BASE_DIR 
JOBS_DIR = os.getenv("JOBS_DIR", os.path.join(_DATA_ROOT, "jobs")) 
os.makedirs(JOBS_DIR, exist_ok=True) 

_JOBS = {}
_JOBS_LOCK = threading.Lock()
ACTIVE_JOB_PATH = os.path.join(JOBS_DIR, "active_job.json") 

PROCESS_PDF_QUEUE_POLL_SECS = float(os.getenv("PROCESS_PDF_QUEUE_POLL_SECS", "2"))
PROCESS_PDF_QUEUE_HEARTBEAT_SECS = int(os.getenv("PROCESS_PDF_QUEUE_HEARTBEAT_SECS", "15"))
PROCESS_PDF_QUEUE_MAX_WAIT_SECS = int(os.getenv("PROCESS_PDF_QUEUE_MAX_WAIT_SECS", "1800"))  # 30 min


def _truthy(value: str) -> bool:
    return (value or "").strip().lower() in ("1", "true", "yes", "y", "on")


_PROCESS_START_TS = time.time()


def _get_rss_bytes() -> int | None:
    # Linux containers: /proc is the most reliable without extra deps.
    try:
        with open("/proc/self/status", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        return int(parts[1]) * 1024  # kB -> bytes
    except Exception:
        pass
    return None


def _read_int_from_file(path: str) -> int | None:
    try:
        raw = open(path, "r", encoding="utf-8").read().strip()
        if not raw or raw == "max":
            return None
        val = int(raw)
        if val <= 0:
            return None
        return val
    except Exception:
        return None


def _detect_memory_limit_bytes() -> int | None:
    # Common cgroup v2/v1 locations inside containers.
    for candidate in (
        "/sys/fs/cgroup/memory.max",
        "/sys/fs/cgroup/memory/memory.limit_in_bytes",
    ):
        val = _read_int_from_file(candidate)
        if val:
            return val
    return None


def _mem_sample() -> dict:
    rss = _get_rss_bytes()
    return {
        "pid": os.getpid(),
        "uptime_s": int(time.time() - _PROCESS_START_TS),
        "rss_bytes": rss,
    }


def start_memory_telemetry(
    interval_secs: int = 30,
    leak_window: int = 10,
    leak_warn_rss_growth_bytes: int = 60 * 1024 * 1024,
):
    window = []

    def _loop():
        while True:
            try:
                sample = _mem_sample()
                window.append(sample.get("rss_bytes") or 0)
                if len(window) > leak_window:
                    window.pop(0)

                if len(window) == leak_window and window[0] and window[-1]:
                    growth = window[-1] - window[0]
                    if growth >= leak_warn_rss_growth_bytes:
                        print(
                            json.dumps(
                                {
                                    "type": "mem_leak_suspect",
                                    "rss_growth_bytes": growth,
                                    "window": leak_window,
                                    **sample,
                                }
                            ),
                            flush=True,
                        )

                print(json.dumps({"type": "mem", **sample}), flush=True)
            except Exception as e:
                try:
                    print(json.dumps({"type": "mem_telemetry_error", "error": str(e)}), flush=True)
                except Exception:
                    pass
            time.sleep(max(1, int(interval_secs)))

    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    return t


def _read_json_file(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _write_json_file_atomic(path: str, obj: dict) -> None:
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp_path, path)


def _get_active_job_id():
    data = _read_json_file(ACTIVE_JOB_PATH)
    if not data:
        return None
    job_id = str(data.get("job_id") or "").strip()
    return job_id or None


def _set_active_job_id(job_id: str) -> bool:
    payload = {"job_id": job_id, "set_at": int(time.time())}
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    try:
        fd = os.open(ACTIVE_JOB_PATH, flags)
    except FileExistsError:
        return False
    except Exception:
        return False

    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        return True
    except Exception:
        try:
            os.close(fd)
        except Exception:
            pass
        return False


def _clear_active_job_id(job_id: str) -> None:
    try:
        data = _read_json_file(ACTIVE_JOB_PATH) or {}
        if str(data.get("job_id") or "") != str(job_id):
            return
        os.remove(ACTIVE_JOB_PATH)
    except FileNotFoundError:
        return
    except Exception:
        return


PROCESS_PDF_ASYNC_DEFAULT = _truthy(
    os.getenv("PROCESS_PDF_ASYNC", "1" if os.getenv("RENDER") else "0")
)
PROCESS_PDF_USE_SUBPROCESS_DEFAULT = _truthy(
    os.getenv(
        "PROCESS_PDF_USE_SUBPROCESS",
        "1" if (os.getenv("RENDER") and os.name != "nt") else "0",
    )
)
PROCESS_PDF_SUBPROCESS_START_METHOD = (
    os.getenv("PROCESS_PDF_SUBPROCESS_START_METHOD", "spawn").strip().lower()
)
JOB_STALE_AFTER_SECS = int(os.getenv("JOB_STALE_AFTER_SECS", "1200"))  # 20 min

ENABLE_MEM_TELEMETRY = _truthy(os.getenv("MEM_TELEMETRY", "1" if os.getenv("RENDER") else "0"))
if ENABLE_MEM_TELEMETRY:
    try:
        interval_ms_raw = os.getenv("MEM_TELEMETRY_INTERVAL_MS")
        if interval_ms_raw:
            interval_secs = max(1, int(int(interval_ms_raw) / 1000))
        else:
            interval_secs = int(os.getenv("MEM_TELEMETRY_INTERVAL_SECS", "30"))
    except ValueError:
        interval_secs = 30
    try:
        leak_window = int(os.getenv("MEM_LEAK_WINDOW", "10"))
    except ValueError:
        leak_window = 10
    try:
        leak_warn = int(os.getenv("MEM_LEAK_WARN_RSS_GROWTH_BYTES", str(60 * 1024 * 1024)))
    except ValueError:
        leak_warn = 60 * 1024 * 1024

    start_memory_telemetry(
        interval_secs=interval_secs,
        leak_window=max(3, leak_window),
        leak_warn_rss_growth_bytes=max(1, leak_warn),
    )

_DETECTED_MEM_LIMIT_BYTES = _detect_memory_limit_bytes()
MEM_GUARD_MAX_RSS_BYTES = None
try:
    configured_guard = int(os.getenv("MEM_GUARD_MAX_RSS_BYTES", "0") or "0")
    if configured_guard > 0:
        MEM_GUARD_MAX_RSS_BYTES = configured_guard
except ValueError:
    MEM_GUARD_MAX_RSS_BYTES = None

if MEM_GUARD_MAX_RSS_BYTES is None and _DETECTED_MEM_LIMIT_BYTES:
    # Default to a safe headroom under the container memory limit.
    MEM_GUARD_MAX_RSS_BYTES = int(_DETECTED_MEM_LIMIT_BYTES * 0.85)


def _job_dir(job_id: str) -> str:
    return os.path.join(JOBS_DIR, job_id)


def _job_status_path(job_id: str) -> str:
    return os.path.join(_job_dir(job_id), "status.json")


def _persist_job(job: dict) -> None:
    col = _jobs_col()
    if col is not None:
        try:
            col.update_one({"job_id": job["job_id"]}, {"$set": job}, upsert=True)
            return
        except PyMongoError as e:
            print(json.dumps({"type": "mongo_job_persist_error", "error": str(e)}), flush=True)
        except Exception as e:
            print(json.dumps({"type": "mongo_job_persist_error", "error": str(e)}), flush=True)

    os.makedirs(_job_dir(job["job_id"]), exist_ok=True)
    tmp_path = _job_status_path(job["job_id"]) + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(job, f, ensure_ascii=False)
    os.replace(tmp_path, _job_status_path(job["job_id"]))


def _load_persisted_job(job_id: str):
    col = _jobs_col()
    if col is not None:
        try:
            doc = col.find_one({"job_id": job_id}, {"_id": 0})
            return doc
        except Exception as e:
            print(json.dumps({"type": "mongo_job_load_error", "error": str(e)}), flush=True)
            # fall through to disk

    path = _job_status_path(job_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _get_job(job_id: str):
    # Disk is the source of truth (background workers may update status from another process).
    job = _load_persisted_job(job_id)
    if job is not None:
        with _JOBS_LOCK:
            _JOBS[job_id] = job
        return job

    with _JOBS_LOCK:
        return _JOBS.get(job_id)


def _update_job(job_id: str, **updates):
    now = int(time.time())
    with _JOBS_LOCK:
        job = _JOBS.get(job_id) or _load_persisted_job(job_id) or {"job_id": job_id}
        job.update(updates)
        job["updated_at"] = now
        _JOBS[job_id] = job
        _persist_job(job)
        return job


def _is_job_stale(job: dict) -> bool:
    try:
        if job.get("status") not in ("queued", "running"):
            return False
        updated_at = int(job.get("updated_at") or 0)
        return int(time.time()) - updated_at > JOB_STALE_AFTER_SECS
    except Exception:
        return False


def _pid_alive(pid: int | None) -> bool:
    if not pid or pid <= 0:
        return False
    # Linux containers: os.kill(pid, 0) checks existence without sending a signal.
    try:
        os.kill(int(pid), 0)
        return True
    except Exception:
        return False


def _get_active_job():
    active_id = _get_active_job_id()
    if not active_id:
        return None

    job = _load_persisted_job(active_id)
    if not job:
        _clear_active_job_id(active_id)
        return None

    if job.get("status") in ("queued", "running") and not _is_job_stale(job):
        # If the worker died (OOM/restart), clear the lock quickly so queued jobs can proceed.
        worker_pid = job.get("worker_pid") or job.get("worker_pid".upper()) or job.get("pid")
        try:
            worker_pid = int(worker_pid) if worker_pid is not None else None
        except Exception:
            worker_pid = None
        if worker_pid and not _pid_alive(worker_pid):
            try:
                _update_job(
                    active_id,
                    status="failed",
                    step="worker_died",
                    error="Active job worker process is not alive (likely OOM/restart).",
                    worker_pid=worker_pid,
                )
            except Exception:
                pass
            _clear_active_job_id(active_id)
            return None
        return job

    if _is_job_stale(job):
        try:
            _update_job(
                active_id,
                status="failed",
                error="Job became stale (service likely restarted)",
                step="stale",
            )
        except Exception:
            pass
    _clear_active_job_id(active_id)
    return None


def _start_background_job(job_id: str, target, args):
    # Use a subprocess by default on Render so heavy PDF/embedding work releases RSS when done.
    # This also isolates crashes from the web worker process.
    use_subprocess = PROCESS_PDF_USE_SUBPROCESS_DEFAULT and os.name != "nt"
    # Safety: on Render free tiers you typically run with a single web worker. If we run the
    # heavy PDF/embedding work in-thread, the status endpoint can become unresponsive and
    # the Node service will time out while polling. Force subprocess mode on Render.
    if os.getenv("RENDER") and os.name != "nt" and not use_subprocess:
        use_subprocess = True
        try:
            _update_job(
                job_id,
                message="PROCESS_PDF_USE_SUBPROCESS was disabled; forcing subprocess mode on Render for stability.",
            )
        except Exception:
            pass
    if use_subprocess:
        try:
            ctx = multiprocessing.get_context(PROCESS_PDF_SUBPROCESS_START_METHOD)
        except ValueError:
            ctx = multiprocessing.get_context("spawn")

        proc = ctx.Process(target=target, args=args)
        proc.daemon = True
        proc.start()
        try:
            _update_job(job_id, worker="process", worker_pid=proc.pid)
        except Exception:
            pass
        return

    t = threading.Thread(target=target, args=args, daemon=True)
    t.start()
    try:
        _update_job(job_id, worker="thread")
    except Exception:
        pass


def _wait_for_slot_and_start_job(job_id: str, runner, runner_args): 
    started_at = time.time()
    next_heartbeat = 0.0

    while True:
        # If the job was cancelled/failed externally, stop waiting.
        job = _load_persisted_job(job_id) or {}
        if job.get("status") != "queued":
            return

        waited = time.time() - started_at
        if PROCESS_PDF_QUEUE_MAX_WAIT_SECS and waited > PROCESS_PDF_QUEUE_MAX_WAIT_SECS:
            try:
                _update_job(
                    job_id,
                    status="failed",
                    step="queue_timeout",
                    error="Timed out waiting for an available PDF processor slot",
                )
            except Exception:
                pass
            return

        # Try to claim the single active slot (but only when it's actually free).
        if not _get_active_job():
            if _set_active_job_id(job_id):
                try:
                    _update_job(job_id, status="queued", step="start_worker", message="Starting PDF processing")
                    _start_background_job(job_id, runner, runner_args)
                except Exception as e:
                    _clear_active_job_id(job_id)
                    try:
                        _update_job(job_id, status="failed", step="start_worker", error=str(e))
                    except Exception:
                        pass
                return

        # Keep the job fresh so it won't be marked stale while waiting in queue.
        now = time.time()
        if now >= next_heartbeat:
            try:
                _update_job(job_id, status="queued", step="queued", message="Waiting for available slot")
            except Exception:
                pass
            next_heartbeat = now + max(5, PROCESS_PDF_QUEUE_HEARTBEAT_SECS)

        time.sleep(max(0.5, PROCESS_PDF_QUEUE_POLL_SECS)) 
 
 
_QUEUE_POLLER_STARTED = False 
 
 
def _queue_poller_loop(): 
    while True: 
        try: 
            if not USE_MONGO: 
                time.sleep(2.0) 
                continue 
 
            # If something is actively running, let it finish. 
            if _get_active_job(): 
                time.sleep(1.0) 
                continue 
 
            col = _jobs_col() 
            if col is None: 
                time.sleep(2.0) 
                continue 
 
            job = col.find_one({"status": "queued"}, {"_id": 0}, sort=[("created_at", 1)]) 
            if not job: 
                time.sleep(1.0) 
                continue 
 
            job_id = str(job.get("job_id") or "").strip() 
            doc_id = str(job.get("doc_id") or "").strip() 
            if not job_id or not doc_id: 
                time.sleep(1.0) 
                continue 
 
            if not _set_active_job_id(job_id): 
                time.sleep(1.0) 
                continue 
 
            try: 
                _update_job(job_id, step="start_worker", message="Starting PDF processing") 
                _start_background_job(job_id, _run_process_pdf_job, (job_id, doc_id)) 
            except Exception as e: 
                _clear_active_job_id(job_id) 
                try: 
                    _update_job(job_id, status="failed", step="start_worker", error=str(e)) 
                except Exception: 
                    pass 
 
            time.sleep(0.2) 
        except Exception as e: 
            try: 
                print(json.dumps({"type": "queue_poller_error", "error": str(e)}), flush=True) 
            except Exception: 
                pass 
            time.sleep(2.0) 
 
 
def _start_queue_poller(): 
    global _QUEUE_POLLER_STARTED 
    if _QUEUE_POLLER_STARTED: 
        return 
    _QUEUE_POLLER_STARTED = True 
    t = threading.Thread(target=_queue_poller_loop, daemon=True) 
    t.start() 
 
 
_start_queue_poller() 


@app.get("/healthz") 
def healthz(): 
    db = _mongo_db() if USE_MONGO else _MONGO_DB
    active = _get_active_job()
    hf_token_present = bool(
        (os.getenv("HF_TOKEN") or "").strip()
        or (os.getenv("HUGGINGFACEHUB_API_TOKEN") or "").strip()
    )
    resp = {
        "status": "ok",
        "uptime_s": int(time.time() - _PROCESS_START_TS),
        "pid": os.getpid(),
        "mongo_enabled": bool(USE_MONGO),
        "mongo_initialized": bool(_MONGO_CLIENT is not None and _MONGO_DB is not None),
        "mongo_db": getattr(db, "name", None) if db is not None else None,
        "gridfs_bucket": PDF_GRIDFS_BUCKET if USE_MONGO else None,
        "mongo_last_error": _MONGO_LAST_ERROR if USE_MONGO else None,
        "process_pdf_async_default": bool(PROCESS_PDF_ASYNC_DEFAULT),
        "process_pdf_use_subprocess_default": bool(PROCESS_PDF_USE_SUBPROCESS_DEFAULT),
        "job_stale_after_secs": int(JOB_STALE_AFTER_SECS),
        "active_job": (
            {
                "job_id": active.get("job_id"),
                "doc_id": active.get("doc_id"),
                "status": active.get("status"),
                "step": active.get("step"),
                "updated_at": active.get("updated_at"),
                "worker_pid": active.get("worker_pid") or active.get("pid"),
            }
            if isinstance(active, dict)
            else None
        ),
        "qa": {
            "mode": (os.getenv("QA_MODE") or "").strip().lower() or "default",
            "backend": (os.getenv("QA_BACKEND") or "hf_hub").strip().lower(),
            "model": (os.getenv("QA_MODEL_NAME") or "google/flan-t5-base").strip(),
            "hf_token_present": hf_token_present,
        },
    }
    return jsonify(resp), 200


@app.get("/process_pdf/status/<job_id>")
def process_pdf_status(job_id: str):
    job = _get_job(job_id)
    if not job:
        resp = jsonify({"error": "Job not found"})
        resp.headers["Cache-Control"] = "no-store"
        return resp, 404
    if _is_job_stale(job):
        job = _update_job(
            job_id,
            status="failed",
            error="Job became stale (service likely restarted)",
            step="stale",
        )
        _clear_active_job_id(job_id)
    if job.get("status") in ("done", "failed"):
        _clear_active_job_id(job_id)
    resp = jsonify(job)
    resp.headers["Cache-Control"] = "no-store"
    return resp, 200


def _set_latest_doc_id(doc_id: str) -> None:
    col = _state_col()
    if col is None:
        return
    try:
        now = int(time.time())
        col.update_one(
            {"key": "latest_doc_id"},
            {"$set": {"key": "latest_doc_id", "doc_id": doc_id, "updated_at": now}},
            upsert=True,
        )
    except Exception:
        return


def _get_latest_doc_id() -> str | None: 
    col = _state_col()
    if col is None:
        return None
    try:
        doc = col.find_one({"key": "latest_doc_id"}, {"_id": 0})
        val = str((doc or {}).get("doc_id") or "").strip()
        return val or None
    except Exception: 
        return None 


def _docs_col():
    db = _mongo_db()
    if db is None:
        return None
    return db["pdf_docs"]


def _chunks_col():
    db = _mongo_db()
    if db is None:
        return None
    return db["pdf_chunks"]


def _gridfs_delete_doc_pdfs(doc_id: str) -> None:
    fs = _grid_fs()
    if fs is None:
        return
    try:
        for f in fs.find({"metadata.kind": "pdf", "metadata.doc_id": doc_id}):
            try:
                fs.delete(f._id)
            except Exception:
                pass
    except Exception:
        return


def _gridfs_store_doc_pdf(doc_id: str, file_obj, *, filename: str, content_type: str, ordinal: int) -> str | None:
    fs = _grid_fs()
    if fs is None:
        return None
    try:
        try:
            file_obj.seek(0)
        except Exception:
            pass
        file_id = fs.put(
            file_obj,
            filename=filename or f"doc-{doc_id}.pdf",
            metadata={"kind": "pdf", "doc_id": doc_id, "ordinal": int(ordinal)},
            contentType=content_type or "application/pdf",
        )
        return str(file_id)
    except Exception as e:
        print(json.dumps({"type": "gridfs_store_pdf_error", "doc_id": doc_id, "error": str(e)}), flush=True)
        return None


def _gridfs_open_doc_pdfs(doc_id: str):
    fs = _grid_fs()
    if fs is None:
        return []
    try:
        cur = (
            fs.find({"metadata.kind": "pdf", "metadata.doc_id": doc_id})
            .sort("metadata.ordinal", 1)
            .sort("uploadDate", 1)
        )
        return list(cur)
    except Exception as e:
        print(json.dumps({"type": "gridfs_open_pdf_error", "doc_id": doc_id, "error": str(e)}), flush=True)
        return []


def _run_process_pdf_job(job_id: str, doc_id: str): 
    try: 
        if not USE_MONGO: 
            raise RuntimeError("MONGO_URI is required for PDF processing (durable jobs + storage).") 
 
        fs = _grid_fs() 
        docs_col = _docs_col() 
        chunks_col = _chunks_col() 
        if fs is None or docs_col is None or chunks_col is None: 
            raise RuntimeError("Mongo/GridFS not initialized. Check MONGO_URI/PDF_GRIDFS_BUCKET.") 
 
        _update_job( 
            job_id, 
            status="running", 
            step="load_pdf", 
            message="Loading PDF(s)", 
            worker_pid=os.getpid(), 
            doc_id=doc_id, 
        ) 
 
        pdf_gridouts = _gridfs_open_doc_pdfs(doc_id) 
        if not pdf_gridouts: 
            raise RuntimeError("No PDF found for this job/doc_id. Re-upload and try again.") 
 
        now = int(time.time()) 
        docs_col.update_one( 
            {"doc_id": doc_id}, 
            {"$set": {"doc_id": doc_id, "status": "processing", "updated_at": now}, "$setOnInsert": {"created_at": now}}, 
            upsert=True, 
        ) 
        try: 
            chunks_col.delete_many({"doc_id": doc_id}) 
        except Exception: 
            pass 
 
        _update_job(job_id, step="extract_text", message="Extracting + chunking text") 
        from pdf_utils import coerce_to_seekable, iter_text_chunks_from_pdf_streams 
 
        try: 
            max_chunks = int(os.getenv("MAX_CHUNKS") or "0") or None 
        except ValueError: 
            max_chunks = None 
        chunk_size = int(os.getenv("CHUNK_SIZE", "1000")) 
        chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200")) 
 
        pdf_streams = [] 
        for grid_out in pdf_gridouts: 
            # Materialize into memory to ensure seekable reads. 25MB PDFs are OK on this pipeline 
            # because we no longer load large ML models / FAISS. 
            pdf_streams.append(coerce_to_seekable(BytesIO(grid_out.read()))) 
 
        batch = [] 
        idx = 0 
        batch_size = 50 
        for chunk in iter_text_chunks_from_pdf_streams( 
            pdf_streams, chunk_size=chunk_size, chunk_overlap=chunk_overlap, max_chunks=max_chunks 
        ): 
            if not (chunk or "").strip(): 
                continue 
            batch.append({"doc_id": doc_id, "idx": idx, "text": chunk}) 
            idx += 1 
            if len(batch) >= batch_size: 
                chunks_col.insert_many(batch, ordered=False) 
                batch = [] 
                if idx % 50 == 0: 
                    _update_job(job_id, step="store_chunks", message=f"Stored {idx} chunks") 
 
        if batch: 
            chunks_col.insert_many(batch, ordered=False) 
 
        docs_col.update_one( 
            {"doc_id": doc_id}, 
            {"$set": {"status": "ready", "chunk_count": idx, "updated_at": int(time.time())}}, 
            upsert=True, 
        ) 
        _set_latest_doc_id(doc_id) 
 
        _update_job( 
            job_id, 
            status="done", 
            step="done", 
            index_built=True, 
            message="PDF processed successfully", 
            doc_id=doc_id, 
            chunk_count=idx, 
            worker_pid=os.getpid(), 
        ) 
    except Exception as e: 
        import traceback 
        traceback.print_exc() 
        try: 
            _update_job(job_id, status="failed", step="failed", error=str(e), worker_pid=os.getpid(), doc_id=doc_id) 
        except Exception: 
            pass 
    finally: 
        _clear_active_job_id(job_id) 

@app.route("/process_pdf", methods=["POST"]) 
def process_pdf(): 
    pdf_files = request.files.getlist("pdfFiles") 

    if not pdf_files:
        data = request.get_json(silent=True) or {}
        if data.get("url") or data.get("source_url") or data.get("source_urls"):
            return jsonify({"error": "URL-based PDF ingestion has been removed. Upload a PDF file instead."}), 400
        return jsonify({"error": "No PDF provided", "hint": "Send multipart/form-data field 'pdfFiles'."}), 400 
 
    if not USE_MONGO: 
        return jsonify({"error": "MONGO_URI is required for reliable PDF processing on hosted deployments."}), 500 

    async_qp = (request.args.get("async") or "").strip().lower()
    prefer = (request.headers.get("Prefer") or "").lower()
    force_async = async_qp in ("1", "true", "yes", "on") or "respond-async" in prefer
    force_sync = async_qp in ("0", "false", "no", "off")
    use_async = (force_async or PROCESS_PDF_ASYNC_DEFAULT) and not force_sync

    if use_async: 
        job_id = uuid.uuid4().hex 
        doc_id = uuid.uuid4().hex 
        created_at = int(time.time()) 
        job = { 
            "job_id": job_id, 
            "doc_id": doc_id, 
            "status": "queued", 
            "step": "queued", 
            "created_at": created_at, 
            "updated_at": created_at, 
            "index_built": False, 
            "request_id": getattr(g, "request_id", None), 
        } 
        with _JOBS_LOCK: 
            _JOBS[job_id] = job 
        _persist_job(job) 
 
        # Store uploaded PDFs in GridFS immediately so a Render restart doesn't lose inputs. 
        stored_ids = [] 
        for i, file in enumerate(pdf_files): 
            fid = _gridfs_store_doc_pdf( 
                doc_id, 
                file.stream, 
                filename=file.filename or f"upload_{i}.pdf", 
                content_type=file.mimetype or "application/pdf", 
                ordinal=i, 
            ) 
            if fid: 
                stored_ids.append(fid) 
        _update_job(job_id, pdf_gridfs_ids=stored_ids, pdf_count=len(stored_ids)) 

        os.makedirs(_job_dir(job_id), exist_ok=True) 
        runner = _run_process_pdf_job 
        runner_args = (job_id, doc_id) 

        # Try to start immediately; otherwise enqueue and respond with the job id.
        if _set_active_job_id(job_id): 
            try: 
                _start_background_job(job_id, runner, runner_args) 
            except Exception as e: 
                _clear_active_job_id(job_id) 
                _update_job(job_id, status="failed", step="start_worker", error=str(e)) 
                return jsonify({"error": "Failed to start background worker", "job_id": job_id}), 500 
        else: 
            _update_job(job_id, message="Queued behind another active job") 
        return jsonify({"job_id": job_id, "doc_id": doc_id, "status": "queued"}), 202 

    # Default to async mode (Node expects this in production). 
    return jsonify({"error": "Synchronous processing is disabled; call /process_pdf?async=1."}), 400 


@app.route("/ask_question", methods=["POST"]) 
def ask_question_route(): 
    try: 
        data = request.get_json(force=True) or {} 
        question = str(data.get("question") or "").strip() 
        print("Received question:", question) 
        if not question: 
            return jsonify({"error": "Missing question"}), 400 
 
        if not USE_MONGO: 
            return jsonify({"error": "MONGO_URI is required for PDF QA."}), 500 
 
        doc_id = str(data.get("doc_id") or data.get("docId") or "").strip() 
        if not doc_id: 
            doc_id = _get_latest_doc_id() or "" 
        if not doc_id: 
            return jsonify({"error": "Missing doc_id. Process a PDF first."}), 400 
 
        docs_col = _docs_col() 
        chunks_col = _chunks_col() 
        if docs_col is None or chunks_col is None: 
            return jsonify({"error": "Mongo is not initialized"}), 500 
 
        doc = docs_col.find_one({"doc_id": doc_id}, {"_id": 0}) or {} 
        if (doc.get("status") or "").lower() != "ready": 
            return jsonify({"error": "Document is not ready", "doc_id": doc_id, "status": doc.get("status")}), 409 
 
        try: 
            max_query_chunks = int(os.getenv("MAX_QUERY_CHUNKS") or "1200") 
        except ValueError: 
            max_query_chunks = 1200 
        cur = chunks_col.find({"doc_id": doc_id}, {"_id": 0, "text": 1}).sort("idx", 1).limit(max(1, max_query_chunks)) 
        chunks = [str(d.get("text") or "") for d in cur] 
        if not chunks: 
            return jsonify({"error": "No chunks found for doc_id", "doc_id": doc_id}), 404 
 
        from pdf_utils import bm25_top_k, build_context, generate_answer 
 
        try: 
            top_k = int(os.getenv("RETRIEVER_TOP_K") or "6") 
        except ValueError: 
            top_k = 6 
        indices = bm25_top_k(chunks, question, k=top_k) 
        try: 
            ctx_max = int(os.getenv("QA_CONTEXT_MAX_CHARS") or "8000") 
        except ValueError: 
            ctx_max = 8000 
        context = build_context(chunks, indices, max_chars=ctx_max) 
        qa = generate_answer(question, context)
        if isinstance(qa, str):
            qa = {"answer": qa, "llm_used": False, "backend": "unknown", "mode": "legacy"}
        qa = qa or {}
        out_text = str(qa.get("answer") or "")
        resp = {
            "response": out_text,
            "doc_id": doc_id,
            "llm_used": bool(qa.get("llm_used")),
            "backend": qa.get("backend"),
            "qa_mode": qa.get("mode"),
        }
        if qa.get("model"):
            resp["model"] = qa.get("model")
        if qa.get("warning"):
            resp["warning"] = qa.get("warning")

        include_context = (os.getenv("QA_INCLUDE_CONTEXT") or "").strip().lower() in ("1", "true", "yes", "on")
        if include_context:
            resp["context"] = context

        print("Answer generated:", (out_text or "")[:200]) 
        return jsonify(resp), 200 
    except Exception as e: 
        import traceback 
        traceback.print_exc() 
        print("❌ Error in /ask_question:", e) 
        return jsonify({"error": str(e)}), 500 

if __name__ == "__main__":
    # Run with python app.py (good for dev). For production, use gunicorn / uvicorn + reverse proxy.
    port = int(os.getenv("PORT") or os.getenv("PY_PORT") or "8082")
    debug = (os.getenv("FLASK_DEBUG") or "").lower() in ("1", "true", "yes", "on")
    app.run(host="0.0.0.0", port=port, debug=debug)

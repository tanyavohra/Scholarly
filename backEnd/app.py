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
import urllib.parse
import urllib.request
import zipfile
from dotenv import load_dotenv

from pymongo import MongoClient
from pymongo.errors import PyMongoError
import gridfs

load_dotenv()



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
                db[f"{PDF_GRIDFS_BUCKET}.files"].create_index([("metadata.doc_id", 1), ("metadata.kind", 1)])
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
FAISS_DIR = os.getenv("FAISS_DIR", "faiss_index")  # folder where index is saved
if not os.path.isabs(FAISS_DIR):
    FAISS_DIR = os.path.join(_BASE_DIR, FAISS_DIR)
os.makedirs(FAISS_DIR, exist_ok=True)

_DATA_ROOT = os.path.dirname(FAISS_DIR) or _BASE_DIR
JOBS_DIR = os.getenv("JOBS_DIR", os.path.join(_DATA_ROOT, "jobs"))
os.makedirs(JOBS_DIR, exist_ok=True)

FAISS_CACHE_DIR = os.getenv("FAISS_CACHE_DIR", os.path.join("/tmp", "brainlink_faiss_cache"))
try:
    os.makedirs(FAISS_CACHE_DIR, exist_ok=True)
except Exception:
    pass

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


def _is_http_url(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url or "")
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def _download_url_to_path(url: str, dest_path: str, max_bytes: int | None = None) -> int:
    if not _is_http_url(url):
        raise ValueError("Invalid URL (must be http/https)")

    timeout_secs = int(
        os.getenv("PDF_DOWNLOAD_TIMEOUT_SECS", "60" if os.getenv("RENDER") else "25")
    )
    req = urllib.request.Request(url, headers={"User-Agent": "brainlink/1.0"})

    total = 0
    try:
        with urllib.request.urlopen(req, timeout=timeout_secs) as resp:
            status = getattr(resp, "status", 200) or 200
            if status >= 400:
                raise ValueError(f"Download failed (status {status})")

            content_length = resp.headers.get("Content-Length")
            if content_length:
                try:
                    cl = int(content_length)
                    if max_bytes and cl > max_bytes:
                        raise ValueError("Remote PDF exceeds size limit")
                except ValueError:
                    # ignore invalid header
                    pass

            with open(dest_path, "wb") as f:
                while True:
                    chunk = resp.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if max_bytes and total > max_bytes:
                        raise ValueError("Remote PDF exceeds size limit")
                    f.write(chunk)
        return total
    except Exception:
        try:
            if os.path.exists(dest_path):
                os.remove(dest_path)
        except Exception:
            pass
        raise


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


@app.get("/healthz")
def healthz():
    db = _mongo_db() if USE_MONGO else _MONGO_DB
    active = _get_active_job()
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


def _gridfs_find_latest_doc_index(doc_id: str):
    fs = _grid_fs()
    if fs is None:
        return None
    try:
        cur = fs.find({"metadata.kind": "faiss", "metadata.doc_id": doc_id}).sort("uploadDate", -1).limit(1)
        for f in cur:
            return f
        return None
    except Exception as e:
        print(json.dumps({"type": "gridfs_find_error", "error": str(e)}), flush=True)
        return None


def _gridfs_delete_doc_indexes(doc_id: str) -> None:
    fs = _grid_fs()
    if fs is None:
        return
    try:
        for f in fs.find({"metadata.kind": "faiss", "metadata.doc_id": doc_id}):
            try:
                fs.delete(f._id)
            except Exception:
                pass
    except Exception:
        return


def _zip_dir(src_dir: str, dst_zip_path: str) -> None:
    with zipfile.ZipFile(dst_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, _dirs, files in os.walk(src_dir):
            for name in files:
                abs_path = os.path.join(root, name)
                rel_path = os.path.relpath(abs_path, src_dir)
                zf.write(abs_path, rel_path)


def _gridfs_store_doc_index(doc_id: str, index_dir: str) -> dict | None:
    fs = _grid_fs()
    if fs is None:
        return None

    zip_path = os.path.join(_DATA_ROOT, f".faiss_{doc_id}.zip")
    try:
        if os.path.exists(zip_path):
            os.remove(zip_path)
    except Exception:
        pass

    try:
        _zip_dir(index_dir, zip_path)
        _gridfs_delete_doc_indexes(doc_id)
        with open(zip_path, "rb") as f:
            file_id = fs.put(
                f,
                filename=f"faiss-{doc_id}.zip",
                metadata={"kind": "faiss", "doc_id": doc_id},
                content_type="application/zip",
            )
        return {"file_id": str(file_id), "filename": f"faiss-{doc_id}.zip"}
    except Exception as e:
        print(json.dumps({"type": "gridfs_store_error", "doc_id": doc_id, "error": str(e)}), flush=True)
        return None
    finally:
        try:
            if os.path.exists(zip_path):
                os.remove(zip_path)
        except Exception:
            pass


def _ensure_doc_index_local(doc_id: str) -> str | None:
    if not doc_id:
        return None

    dest_dir = os.path.join(FAISS_CACHE_DIR, doc_id)
    index_file = os.path.join(dest_dir, "index.faiss")
    if os.path.exists(index_file):
        return dest_dir

    fs = _grid_fs()
    if fs is None:
        return None

    grid_out = _gridfs_find_latest_doc_index(doc_id)
    if grid_out is None:
        return None

    tmp_zip = os.path.join(FAISS_CACHE_DIR, f".dl_{doc_id}.zip")
    try:
        os.makedirs(dest_dir, exist_ok=True)
        with open(tmp_zip, "wb") as out:
            while True:
                chunk = grid_out.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)

        # Extract into a clean dir.
        for name in os.listdir(dest_dir):
            try:
                p = os.path.join(dest_dir, name)
                if os.path.isdir(p):
                    shutil.rmtree(p, ignore_errors=True)
                else:
                    os.remove(p)
            except Exception:
                pass

        with zipfile.ZipFile(tmp_zip, "r") as zf:
            zf.extractall(dest_dir)

        if os.path.exists(index_file):
            return dest_dir
        return None
    except Exception as e:
        print(json.dumps({"type": "gridfs_extract_error", "doc_id": doc_id, "error": str(e)}), flush=True)
        return None
    finally:
        try:
            if os.path.exists(tmp_zip):
                os.remove(tmp_zip)
        except Exception:
            pass


def _run_process_pdf_job(job_id: str, doc_id: str, pdf_paths: list[str]):
    try:
        _update_job(
            job_id,
            status="running",
            step="extract_text",
            message="Extracting text",
            pid=os.getpid(),
            doc_id=doc_id,
        )

        # Import chunking helpers first (lightweight). Embedding/FAISS imports are heavier,
        # so we load them only after updating the job step to "build_index".
        from pdf_utils import iter_text_chunks_from_pdfs

        streams = []
        try:
            for p in pdf_paths:
                streams.append(open(p, "rb"))

            _update_job(job_id, step="chunk_text", message="Chunking text")
            chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
            chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
            text_chunks = iter_text_chunks_from_pdfs(
                streams, chunk_size=chunk_size, chunk_overlap=chunk_overlap
            )

            _update_job(job_id, step="build_index", message="Building embeddings/index")
            from pdf_utils import get_vector_store
            tmp_dir = os.path.join(_DATA_ROOT, f".faiss_tmp_{job_id}")
            if os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)
            get_vector_store(text_chunks, store_dir=tmp_dir)
        finally:
            for s in streams:
                try:
                    s.close()
                except Exception:
                    pass

            # Best-effort cleanup of uploaded PDFs (keeps only status.json).
            for p in pdf_paths:
                try:
                    os.remove(p)
                except Exception:
                    pass

        _update_job(job_id, step="store_index", message="Storing index")
        index_ok = os.path.exists(os.path.join(tmp_dir, "index.faiss"))
        stored = None
        if index_ok and USE_MONGO:
            stored = _gridfs_store_doc_index(doc_id, tmp_dir)

        _update_job(job_id, step="swap_index", message="Finalizing index")
        try:
            if os.path.exists(FAISS_DIR):
                shutil.rmtree(FAISS_DIR, ignore_errors=True)
            os.rename(tmp_dir, FAISS_DIR)
        except Exception:
            pass

        # Cache by doc_id for this runtime (so ask_question doesn't immediately re-download).
        try:
            doc_cache_dir = os.path.join(FAISS_CACHE_DIR, doc_id)
            if os.path.exists(doc_cache_dir):
                shutil.rmtree(doc_cache_dir, ignore_errors=True)
            if os.path.exists(FAISS_DIR):
                shutil.copytree(FAISS_DIR, doc_cache_dir, dirs_exist_ok=True)
        except Exception:
            pass

        _update_job(
            job_id,
            status="done",
            step="done",
            index_built=bool(index_ok),
            message="PDF processed successfully",
            faiss_dir=FAISS_DIR,
            doc_id=doc_id,
            index_stored=bool(stored),
            index_storage=stored,
            pid=os.getpid(),
        )
        if index_ok:
            _set_latest_doc_id(doc_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            _update_job(job_id, status="failed", step="failed", error=str(e), pid=os.getpid())
        except Exception:
            pass
    finally:
        _clear_active_job_id(job_id)


def _run_process_pdf_job_from_urls(job_id: str, doc_id: str, source_urls: list[str]):
    try:
        job_dir = _job_dir(job_id)
        os.makedirs(job_dir, exist_ok=True)

        max_bytes = app.config.get("MAX_CONTENT_LENGTH")
        if not max_bytes:
            try:
                max_bytes = int(os.getenv("MAX_UPLOAD_BYTES") or "0") or None
            except ValueError:
                max_bytes = None

        _update_job(
            job_id,
            status="running",
            step="download_pdf",
            message="Downloading PDF",
            pid=os.getpid(),
            doc_id=doc_id,
        )
        pdf_paths = []
        for i, url in enumerate(source_urls or []):
            dst = os.path.join(job_dir, f"download_{i}.pdf")
            _download_url_to_path(url, dst, max_bytes=max_bytes)
            pdf_paths.append(dst)

        _run_process_pdf_job(job_id, doc_id, pdf_paths)
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            _update_job(job_id, status="failed", step="download_pdf", error=str(e))
        except Exception:
            pass
    finally:
        # If download fails early, make sure we release the "only one active job" lock.
        # (If processing continues via _run_process_pdf_job, that function will clear it instead.)
        job = _load_persisted_job(job_id) or {}
        if job.get("status") not in ("queued", "running"):
            _clear_active_job_id(job_id)

@app.route("/process_pdf", methods=["POST"])
def process_pdf():
    pdf_files = request.files.getlist("pdfFiles")

    source_urls = []
    if not pdf_files:
        data = request.get_json(silent=True) or {}
        if isinstance(data.get("source_urls"), list):
            source_urls = [str(u).strip() for u in (data.get("source_urls") or []) if str(u).strip()]
        else:
            single = str(data.get("source_url") or data.get("url") or "").strip()
            if single:
                source_urls = [single]

    if source_urls:
        invalid = [u for u in source_urls if not _is_http_url(u)]
        if invalid:
            return jsonify({"error": "Invalid source_url", "invalid": invalid[:3]}), 400

    if not pdf_files and not source_urls:
        return jsonify({"error": "No PDF provided", "hint": "Send multipart/form-data field 'pdfFiles' or JSON { source_url }"}), 400

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

        job_dir = _job_dir(job_id)
        os.makedirs(job_dir, exist_ok=True)

        runner = None
        runner_args = None

        if pdf_files:
            pdf_paths = []
            for i, file in enumerate(pdf_files):
                dst = os.path.join(job_dir, f"upload_{i}.pdf")
                file.save(dst)
                pdf_paths.append(dst)

            runner = _run_process_pdf_job
            runner_args = (job_id, doc_id, pdf_paths)
        else:
            _update_job(job_id, source_urls=source_urls, message="Queued URL download")
            runner = _run_process_pdf_job_from_urls
            runner_args = (job_id, doc_id, source_urls)

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
            threading.Thread(
                target=_wait_for_slot_and_start_job,
                args=(job_id, runner, runner_args),
                daemon=True,
            ).start()
        return jsonify({"job_id": job_id, "doc_id": doc_id, "status": "queued"}), 202

    # Synchronous path: guard against corrupting FAISS_DIR while another job is running.
    active = _get_active_job()
    if active:
        return jsonify({"error": "A PDF is already processing", "job_id": active.get("job_id"), "doc_id": active.get("doc_id")}), 409

    doc_id = uuid.uuid4().hex
    try:
        from pdf_utils import iter_text_chunks_from_pdfs, get_vector_store

        # 1️⃣ Extract text from PDFs

        # 2️⃣ Split text into chunks
        streams = []
        tmp_dir = None
        sources = pdf_files
        if source_urls:
            tmp_dir = os.path.join(_DATA_ROOT, f".url_tmp_{uuid.uuid4().hex}")
            os.makedirs(tmp_dir, exist_ok=True)

            max_bytes = app.config.get("MAX_CONTENT_LENGTH")
            if not max_bytes:
                try:
                    max_bytes = int(os.getenv("MAX_UPLOAD_BYTES") or "0") or None
                except ValueError:
                    max_bytes = None

            pdf_paths = []
            for i, url in enumerate(source_urls):
                dst = os.path.join(tmp_dir, f"download_{i}.pdf")
                _download_url_to_path(url, dst, max_bytes=max_bytes)
                pdf_paths.append(dst)

            for p in pdf_paths:
                streams.append(open(p, "rb"))
            sources = streams

        chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
        chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
        text_chunks = iter_text_chunks_from_pdfs(
            sources, chunk_size=chunk_size, chunk_overlap=chunk_overlap
        )

        # 3️⃣ Create FAISS index (local embeddings)
        get_vector_store(text_chunks, store_dir=FAISS_DIR)

        for s in streams:
            try:
                s.close()
            except Exception:
                pass
        if tmp_dir and os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)

        index_ok = os.path.exists(os.path.join(FAISS_DIR, "index.faiss"))
        stored = None
        if index_ok and USE_MONGO:
            stored = _gridfs_store_doc_index(doc_id, FAISS_DIR)
            _set_latest_doc_id(doc_id)
        print("PDF processed successfully.")
        return jsonify(
            {
                "message": "PDF processed successfully",
                "faiss_dir": FAISS_DIR,
                "index_built": bool(index_ok),
                "doc_id": doc_id,
                "index_stored": bool(stored),
                "index_storage": stored,
            }
        ), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Error in /process_pdf:", e)
        try:
            for s in streams:
                try:
                    s.close()
                except Exception:
                    pass
            if tmp_dir and os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/ask_question", methods=["POST"])
def ask_question_route():
    try:
        data = request.get_json(force=True) or {}
        question = str(data.get("question") or "").strip()
        print("Received question:", question)
        if not question:
            return jsonify({"error": "Missing question"}), 400

        doc_id = str(data.get("doc_id") or data.get("docId") or "").strip()
        if not doc_id:
            doc_id = _get_latest_doc_id() or ""

        index_path = None
        if doc_id and USE_MONGO:
            index_path = _ensure_doc_index_local(doc_id)

        if not index_path and os.path.isdir(FAISS_DIR) and os.path.exists(os.path.join(FAISS_DIR, "index.faiss")):
            index_path = FAISS_DIR

        if not index_path:
            return jsonify({"error": "Index not found. Process the PDF again.", "doc_id": doc_id or None}), 404
        from pdf_utils import answer_question
        response = answer_question(question, index_path=index_path)
        out_text = response.get("output_text") if isinstance(response, dict) else str(response)
        print("Answer generated:", out_text[:200])
        return jsonify({"response": out_text, "doc_id": doc_id or None}), 200
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

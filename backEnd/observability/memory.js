const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const v8 = require("node:v8");
const { monitorEventLoopDelay } = require("node:perf_hooks");

function _readIntFromFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw || raw === "max") return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  } catch {
    return null;
  }
}

function detectMemoryLimitBytes() {
  // Works on many Linux container runtimes (cgroup v2 first, then v1).
  const candidates = [
    "/sys/fs/cgroup/memory.max",
    "/sys/fs/cgroup/memory/memory.limit_in_bytes",
  ];
  for (const candidate of candidates) {
    const value = _readIntFromFile(candidate);
    if (value == null) continue;
    // Some systems report an effectively-unlimited number; ignore those.
    const total = os.totalmem();
    if (Number.isFinite(total) && total > 0 && value > total * 0.99) continue;
    return value;
  }
  return null;
}

function getMemorySample() {
  const mu = process.memoryUsage();
  return {
    pid: process.pid,
    uptime_s: Math.round(process.uptime()),
    rss: mu.rss,
    heap_total: mu.heapTotal,
    heap_used: mu.heapUsed,
    external: mu.external,
    array_buffers: mu.arrayBuffers,
  };
}

function startMemoryTelemetry({
  intervalMs = 30_000,
  log = console.log,
  forceGc = false,
  leakWindow = 10,
  leakWarnHeapGrowthBytes = 30 * 1024 * 1024,
} = {}) {
  const eld = monitorEventLoopDelay({ resolution: 20 });
  eld.enable();

  const heapUsedWindow = [];
  const rssWindow = [];

  const timer = setInterval(() => {
    try {
      if (forceGc && typeof global.gc === "function") global.gc();
      const mem = getMemorySample();
      const eventLoop = {
        delay_mean_ms: Number.isFinite(eld.mean) ? Math.round(eld.mean / 1e6) : undefined,
        delay_p99_ms: Number.isFinite(eld.percentile(99))
          ? Math.round(eld.percentile(99) / 1e6)
          : undefined,
        delay_max_ms: Number.isFinite(eld.max) ? Math.round(eld.max / 1e6) : undefined,
      };
      eld.reset();

      heapUsedWindow.push(mem.heap_used);
      rssWindow.push(mem.rss);
      if (heapUsedWindow.length > leakWindow) heapUsedWindow.shift();
      if (rssWindow.length > leakWindow) rssWindow.shift();

      if (heapUsedWindow.length === leakWindow) {
        const heapGrowth = heapUsedWindow[heapUsedWindow.length - 1] - heapUsedWindow[0];
        if (heapGrowth >= leakWarnHeapGrowthBytes) {
          log(
            JSON.stringify({
              type: "mem_leak_suspect",
              heap_growth_bytes: heapGrowth,
              window: leakWindow,
              ...mem,
            }),
          );
        }
      }

      log(JSON.stringify({ type: "mem", ...mem, event_loop: eventLoop }));
    } catch (err) {
      log(JSON.stringify({ type: "mem_telemetry_error", message: err?.message || String(err) }));
    }
  }, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
}

function installHeapSnapshotSignal({
  dir = process.env.HEAP_SNAPSHOT_DIR || os.tmpdir(),
  signal = "SIGUSR2",
  log = console.log,
} = {}) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }

  try {
    process.on(signal, () => {
      try {
        const filename = path.join(dir, `heap-${process.pid}-${Date.now()}.heapsnapshot`);
        const writtenPath = v8.writeHeapSnapshot(filename);
        log(JSON.stringify({ type: "heap_snapshot_written", path: writtenPath || filename }));
      } catch (err) {
        log(
          JSON.stringify({
            type: "heap_snapshot_error",
            message: err?.message || String(err),
          }),
        );
      }
    });
  } catch (err) {
    log(JSON.stringify({ type: "heap_snapshot_signal_unsupported", message: err?.message || String(err) }));
  }
}

function createMemoryGuard({
  maxRssBytes,
  maxHeapUsedBytes,
  log = console.warn,
} = {}) {
  const detectedLimit = detectMemoryLimitBytes();
  const effectiveMaxRssBytes =
    typeof maxRssBytes === "number" && Number.isFinite(maxRssBytes) && maxRssBytes > 0
      ? maxRssBytes
      : detectedLimit
        ? Math.floor(detectedLimit * 0.85)
        : null;

  const effectiveMaxHeapUsedBytes =
    typeof maxHeapUsedBytes === "number" && Number.isFinite(maxHeapUsedBytes) && maxHeapUsedBytes > 0
      ? maxHeapUsedBytes
      : null;

  return function memoryGuard(req, res, next) {
    const mu = process.memoryUsage();
    if (effectiveMaxRssBytes && mu.rss > effectiveMaxRssBytes) {
      log(
        JSON.stringify({
          type: "mem_guard_reject",
          path: req.originalUrl || req.url,
          rss: mu.rss,
          max_rss: effectiveMaxRssBytes,
        }),
      );
      res.set("Connection", "close");
      return res.status(503).json({
        error: "Server is under memory pressure. Please retry shortly.",
        stage: "mem_guard",
      });
    }

    if (effectiveMaxHeapUsedBytes && mu.heapUsed > effectiveMaxHeapUsedBytes) {
      log(
        JSON.stringify({
          type: "mem_guard_reject",
          path: req.originalUrl || req.url,
          heap_used: mu.heapUsed,
          max_heap_used: effectiveMaxHeapUsedBytes,
        }),
      );
      res.set("Connection", "close");
      return res.status(503).json({
        error: "Server is under memory pressure. Please retry shortly.",
        stage: "mem_guard",
      });
    }

    return next();
  };
}

module.exports = {
  detectMemoryLimitBytes,
  getMemorySample,
  startMemoryTelemetry,
  installHeapSnapshotSignal,
  createMemoryGuard,
};


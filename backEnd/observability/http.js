const crypto = require("node:crypto");

function requestIdMiddleware({ headerName = "x-request-id" } = {}) {
  return function requestId(req, res, next) {
    const incoming = req.headers?.[headerName];
    const requestId =
      (typeof incoming === "string" && incoming.trim()) ||
      (typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
    req.id = requestId;
    res.setHeader(headerName, requestId);
    next();
  };
}

function requestTelemetryMiddleware({
  log = console.log,
  sampleRate = 1,
} = {}) {
  const shouldSample = () => sampleRate >= 1 || Math.random() < sampleRate;

  return function requestTelemetry(req, res, next) {
    if (!shouldSample()) return next();

    const startHr = process.hrtime.bigint();
    const startMem = process.memoryUsage();

    const done = () => {
      const endHr = process.hrtime.bigint();
      const endMem = process.memoryUsage();
      const durationMs = Number(endHr - startHr) / 1e6;

      log(
        JSON.stringify({
          type: "http",
          id: req.id,
          method: req.method,
          path: req.originalUrl || req.url,
          status: res.statusCode,
          duration_ms: Math.round(durationMs),
          mem_delta: {
            rss: endMem.rss - startMem.rss,
            heap_used: endMem.heapUsed - startMem.heapUsed,
            external: endMem.external - startMem.external,
            array_buffers: (endMem.arrayBuffers || 0) - (startMem.arrayBuffers || 0),
          },
          mem_end: {
            rss: endMem.rss,
            heap_used: endMem.heapUsed,
          },
        }),
      );
    };

    res.once("finish", done);
    res.once("close", done);
    next();
  };
}

function createRateLimiter({
  windowMs = 60_000,
  max = 60,
  keyFn,
  log = console.warn,
  maxKeys = 10_000,
} = {}) {
  const buckets = new Map();

  const keyFor = keyFn
    ? keyFn
    : (req) => {
        const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
        return ip || req.ip || "unknown";
      };

  const cleanup = () => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    if (buckets.size > maxKeys) {
      // Prevent unbounded growth under attack.
      buckets.clear();
    }
  };

  const timer = setInterval(cleanup, windowMs).unref?.();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = keyFor(req);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    if (bucket.count > max) {
      log(
        JSON.stringify({
          type: "rate_limited",
          id: req.id,
          key,
          path: req.originalUrl || req.url,
          window_ms: windowMs,
          max,
        }),
      );
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests. Please retry later." });
    }

    next();
  };
}

module.exports = {
  requestIdMiddleware,
  requestTelemetryMiddleware,
  createRateLimiter,
};


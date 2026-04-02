const express = require("express");
const cors = require("cors");
const path = require('path');
const os = require("node:os");
const crypto = require("node:crypto");
const { pipeline } = require("node:stream/promises");
const { Transform } = require("node:stream");
const cookiesParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { connectStorageEmulator } = require("firebase/storage");
const fs = require('fs');
const { Poppler } = require('node-poppler');
const poppler = new Poppler();
const app = express();
const axios = require('axios');
const bcrypt = require('bcrypt');
const { generateThumbnail } = require('pdf-thumbnail');
const { Blob } = require('buffer');
const multer = require('multer');
const mongoose = require("mongoose");

const {
  startMemoryTelemetry,
  installHeapSnapshotSignal,
  createMemoryGuard,
} = require("./observability/memory");
const {
  requestIdMiddleware,
  requestTelemetryMiddleware,
  createRateLimiter,
} = require("./observability/http");
// Always load `backEnd/.env` regardless of the process working directory (Render often runs from repo root).
require("dotenv").config({ path: path.join(__dirname, ".env") });

const nextId = require("./models/nextId");
const User = require("./models/User");
const Question = require("./models/Question");
const Vote = require("./models/Vote");
const Comment = require("./models/Comment");
const CommentVote = require("./models/CommentVote");
const Note = require("./models/Note");
const NoteVote = require("./models/NoteVote");
const ContactMessage = require("./models/ContactMessage");
const Tag = require("./models/Tag");
const QuestionTag = require("./models/QuestionTag");
const MarkedQuestion = require("./models/MarkedQuestion");
const MarkedNote = require("./models/MarkedNote");

let mongoLastError = null;
mongoose.connection.on("connected", () => {
  mongoLastError = null;
  console.log("MongoDB connected");
});
mongoose.connection.on("error", (err) => {
  mongoLastError = err;
  console.error("MongoDB connection error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

async function connectMongo() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn("MONGO_URI is not set; MongoDB will not connect.");
    return;
  }
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "8000", 10),
      connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS || "8000", 10),
    });
  } catch (err) {
    mongoLastError = err;
    console.error("Failed to connect to MongoDB:", err);
  }
}

connectMongo();
const MAX_UPLOAD_BYTES = (() => {
  const parsed = parseInt(process.env.MAX_UPLOAD_BYTES || `${25 * 1024 * 1024}`, 10); // 25 MiB default
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25 * 1024 * 1024;
})();
const MAX_UPLOAD_FILES = (() => {
  const parsed = parseInt(process.env.MAX_UPLOAD_FILES || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
})();
let UPLOAD_TMP_DIR = process.env.UPLOAD_TMP_DIR || path.join(os.tmpdir(), "brainlink_uploads");
try {
  fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
} catch (err) {
  console.warn(
    `Failed to create UPLOAD_TMP_DIR=${UPLOAD_TMP_DIR}; falling back to OS temp dir. Error: ${err?.message || err}`,
  );
  UPLOAD_TMP_DIR = path.join(os.tmpdir(), "brainlink_uploads");
  try {
    fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
  } catch (err2) {
    console.error(
      `Failed to create fallback UPLOAD_TMP_DIR=${UPLOAD_TMP_DIR}. File uploads may fail. Error: ${err2?.message || err2}`,
    );
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const reqDir = path.join(UPLOAD_TMP_DIR, String(req.id || "noid"));
      try {
        fs.mkdirSync(reqDir, { recursive: true });
      } catch {
        // ignore
      }
      cb(null, reqDir);
    },
    filename: (req, file, cb) => {
      const safeName = `upload-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`;
      cb(null, safeName);
    },
  }),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: MAX_UPLOAD_FILES,
  },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
    if (!isPdf) {
      return cb(Object.assign(new Error("Only PDF files are allowed"), { statusCode: 400 }));
    }
    return cb(null, true);
  },
});
const FormData = require('form-data'); // If using node-fetch or axios, still use form-data

const PROCESSPDF_SOURCE_URL_ENABLE =
  process.env.PROCESSPDF_SOURCE_URL_ENABLE != null
    ? truthy(process.env.PROCESSPDF_SOURCE_URL_ENABLE)
    : Boolean(process.env.RENDER || process.env.NODE_ENV === "production");
const PROCESSPDF_SOURCE_TTL_MS = (() => {
  const parsed = parseInt(process.env.PROCESSPDF_SOURCE_TTL_MS || `${60 * 60 * 1000}`, 10); // 1 hour
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 1000;
})();
const PROCESSPDF_SOURCE_MAX_ENTRIES = (() => {
  const parsed = parseInt(process.env.PROCESSPDF_SOURCE_MAX_ENTRIES || "200", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
})();
const PROCESSPDF_SOURCES_DIR = path.join(UPLOAD_TMP_DIR, "processpdf_sources");
try {
  fs.mkdirSync(PROCESSPDF_SOURCES_DIR, { recursive: true });
} catch (err) {
  console.warn(
    `Failed to create processpdf source dir at ${PROCESSPDF_SOURCES_DIR}: ${err?.message || err}`,
  );
}

const processPdfSources = new Map(); // token -> { path, filename, contentType, expiresAt }

function isLocalHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1";
}

function normalizeBaseUrl(candidate) {
  const trimmed = String(candidate || "").trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (isLocalHostname(parsed.hostname)) return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function getPublicBaseUrl(req) {
  const configured = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  if (configured) return configured;
  if ((process.env.PUBLIC_BASE_URL || "").trim()) {
    console.warn("PUBLIC_BASE_URL is set but invalid/unreachable (must be public http(s) URL).");
  }

  const protoRaw = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const hostRaw = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  const proto = protoRaw || req.protocol || "https";
  if (!hostRaw) return null;
  return normalizeBaseUrl(`${proto}://${hostRaw}`);
}

function sanitizeFilename(name) {
  const base = String(name || "file.pdf").replace(/[\\\/]/g, "_");
  return base.length > 180 ? base.slice(-180) : base;
}

async function registerProcessPdfSourceFile({ filePath, filename, contentType }) {
  const rawToken =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");
  const token = rawToken.replace(/[^a-zA-Z0-9_-]/g, "");
  const destPath = path.join(PROCESSPDF_SOURCES_DIR, `${token}.pdf`);
  await fs.promises.rename(filePath, destPath);
  processPdfSources.set(token, {
    path: destPath,
    filename: filename || "file.pdf",
    contentType: contentType || "application/pdf",
    expiresAt: Date.now() + PROCESSPDF_SOURCE_TTL_MS,
  });

  // Prevent unbounded growth (and disk usage) under heavy traffic.
  if (processPdfSources.size > PROCESSPDF_SOURCE_MAX_ENTRIES) {
    try {
      await cleanupProcessPdfSources();
      const excess = processPdfSources.size - PROCESSPDF_SOURCE_MAX_ENTRIES;
      if (excess > 0) {
        let removed = 0;
        for (const [oldToken, meta] of processPdfSources.entries()) {
          if (removed >= excess) break;
          // Skip the token we just added.
          if (oldToken === token) continue;
          processPdfSources.delete(oldToken);
          removed += 1;
          try {
            if (meta?.path) await fs.promises.unlink(meta.path);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore eviction errors
    }
  }

  return { token, path: destPath };
}

async function cleanupProcessPdfSources() {
  const now = Date.now();
  for (const [token, meta] of processPdfSources.entries()) {
    if (!meta || meta.expiresAt <= now) {
      processPdfSources.delete(token);
      try {
        if (meta?.path) await fs.promises.unlink(meta.path);
      } catch {
        // ignore
      }
    }
  }
}

setInterval(
  () => cleanupProcessPdfSources().catch(() => {}),
  Math.min(10 * 60 * 1000, Math.max(60 * 1000, Math.floor(PROCESSPDF_SOURCE_TTL_MS / 2))),
).unref?.();

app.get("/processpdf/source/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    const meta = processPdfSources.get(token);
    if (!meta || meta.expiresAt <= Date.now()) {
      if (meta && meta.expiresAt <= Date.now()) {
        processPdfSources.delete(token);
        try {
          await fs.promises.unlink(meta.path);
        } catch {
          // ignore
        }
      }
      return res.status(404).json({ error: "Not found" });
    }

    let stat;
    try {
      stat = await fs.promises.stat(meta.path);
    } catch {
      processPdfSources.delete(token);
      return res.status(404).json({ error: "Not found" });
    }

    res.setHeader("Content-Type", meta.contentType || "application/pdf");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=\"${sanitizeFilename(meta.filename)}\"`,
    );
    await pipeline(fs.createReadStream(meta.path), res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "Failed to stream PDF" });
  }
});

const PORT = parseInt(process.env.PORT || "8081", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";
const DEFAULT_PYTHON_BASE_URL = "https://scholarly-k19m.onrender.com";
let PYTHON_BASE_URL = (process.env.PYTHON_BASE_URL || DEFAULT_PYTHON_BASE_URL).replace(/\/+$/, "");
const PYTHON_PROCESS_PDF_TIMEOUT_MS = parseInt(process.env.PYTHON_PROCESS_PDF_TIMEOUT_MS || "300000", 10); // 5 min
const PYTHON_PROCESS_PDF_RETRIES = parseInt(process.env.PYTHON_PROCESS_PDF_RETRIES || "1", 10);
const PYTHON_PROCESS_PDF_STATUS_TIMEOUT_MS = parseInt(
  process.env.PYTHON_PROCESS_PDF_STATUS_TIMEOUT_MS || "30000",
  10,
); // 30s
const PYTHON_PROCESS_PDF_STATUS_RETRIES = parseInt(process.env.PYTHON_PROCESS_PDF_STATUS_RETRIES || "2", 10);
const PYTHON_PROCESS_PDF_ASYNC =
  process.env.PYTHON_PROCESS_PDF_ASYNC != null
    ? ["1", "true", "yes", "on"].includes(String(process.env.PYTHON_PROCESS_PDF_ASYNC).toLowerCase())
    : Boolean(process.env.RENDER);

// Guardrail: a localhost URL is never reachable from a deployed Render service.
// If someone accidentally sets PYTHON_BASE_URL to localhost in Render, override it.
if (process.env.RENDER) {
  try {
    const hostname = new URL(PYTHON_BASE_URL).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
      console.warn(
        `PYTHON_BASE_URL was set to ${PYTHON_BASE_URL} on Render; overriding to ${DEFAULT_PYTHON_BASE_URL}`,
      );
      PYTHON_BASE_URL = DEFAULT_PYTHON_BASE_URL;
    }
  } catch {
    // If it's not a valid URL, keep it as-is; the downstream request will fail with a clear error.
  }
}
console.log(`PYTHON_BASE_URL=${PYTHON_BASE_URL}`);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // non-browser clients
  if (CORS_ORIGINS.includes("*")) return true;
  if (CORS_ORIGINS.includes(origin)) return true;

  // Allow Vercel preview/prod frontends by default (common deployment for this repo).
  // If you need stricter control, set CORS_ORIGINS explicitly in your environment.
  try {
    const url = new URL(origin);
    if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) return true;
  } catch {
    // ignore invalid Origin header
  }
  return false;
}

if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-insecure-change-me") {
  console.warn("JWT_SECRET is not set; set it in production.");
}

app.set("trust proxy", 1);

function truthy(value) {
  return ["1", "true", "yes", "y", "on"].includes(String(value || "").trim().toLowerCase());
}

const ENABLE_MEM_TELEMETRY =
  process.env.MEM_TELEMETRY != null
    ? truthy(process.env.MEM_TELEMETRY)
    : process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

if (ENABLE_MEM_TELEMETRY) {
  startMemoryTelemetry({
    intervalMs: parseInt(process.env.MEM_TELEMETRY_INTERVAL_MS || "30000", 10),
    forceGc: truthy(process.env.MEM_TELEMETRY_FORCE_GC),
    leakWindow: parseInt(process.env.MEM_LEAK_WINDOW || "10", 10),
    leakWarnHeapGrowthBytes: parseInt(process.env.MEM_LEAK_WARN_HEAP_GROWTH_BYTES || `${30 * 1024 * 1024}`, 10),
  });
}

if (truthy(process.env.HEAP_SNAPSHOT_ENABLE)) {
  installHeapSnapshotSignal({
    dir: process.env.HEAP_SNAPSHOT_DIR,
    signal: process.env.HEAP_SNAPSHOT_SIGNAL || "SIGUSR2",
  });
}

app.use(requestIdMiddleware());
app.use(
  createMemoryGuard({
    maxRssBytes: parseInt(process.env.MEM_GUARD_MAX_RSS_BYTES || "0", 10) || undefined,
    maxHeapUsedBytes: parseInt(process.env.MEM_GUARD_MAX_HEAP_USED_BYTES || "0", 10) || undefined,
  }),
);
app.use(
  requestTelemetryMiddleware({
    sampleRate: Math.max(
      0,
      Math.min(
        1,
        parseFloat(
          process.env.HTTP_TELEMETRY_SAMPLE_RATE ||
            (process.env.NODE_ENV === "production" || process.env.RENDER ? "0.1" : "1"),
        ),
      ),
    ),
  }),
);

app.get('/pdf-thumbnail', async (req, res) => {
  try {
    const pdfUrl = req.query.url;
    if (!pdfUrl) return res.status(400).json({ error: "Missing url" });

    const parsed = new URL(pdfUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Invalid url protocol" });
    }

    const thumbnail = await generateThumbnail(pdfUrl);
    res.type('image/jpeg').send(thumbnail);
  } catch (e) {
    res.status(500).json({ error: "Failed to generate thumbnail" });
  }
});


app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin) and allowlisted browser origins.
    if (isAllowedOrigin(origin)) return callback(null, true);
    // Don't throw (which becomes a 500/HTML error). Return a clean 403 instead.
    return callback(Object.assign(new Error("Not allowed by CORS"), { statusCode: 403 }));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "256kb" }));
app.use(cookiesParser());

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    // In production, the frontend may be hosted on a different origin (e.g. Vercel) than the API (e.g. Render).
    // SameSite=None is required for cross-site XHR with credentials.
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  };
}

app.get("/healthz", async (req, res) => {
  try {
    return res.json({
      status: "ok",
      python_base_url: PYTHON_BASE_URL,
      ...(process.env.RENDER_GIT_COMMIT ? { git_commit: process.env.RENDER_GIT_COMMIT } : {}),
    });
  } catch (err) {
    return res.status(500).json({ status: "error" });
  }
});

app.get("/readyz", async (req, res) => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }
    if (mongoose.connection.readyState !== 1) {
      const detail =
        process.env.NODE_ENV === "production"
          ? ""
          : (mongoLastError?.message ? ` (${mongoLastError.message})` : "");
      throw new Error(`Database not connected${detail}`);
    }
    await axios.get(`${PYTHON_BASE_URL}/healthz`, { timeout: 3000 });
    res.json({ status: "ready" });
  } catch (e) {
    res.status(503).json({
      status: "not_ready",
      ...(process.env.NODE_ENV === "production" ? {} : { error: e?.message || "not_ready" }),
    });
  }
});

const contactRateLimit = createRateLimiter({
  windowMs: parseInt(process.env.CONTACT_RATE_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.CONTACT_RATE_MAX || "30", 10),
});

app.post("/api/contact", contactRateLimit, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const email = String(req.body?.email || "").trim().slice(0, 200);
    const subject = String(req.body?.subject || "").trim().slice(0, 200);
    const message = String(req.body?.message || "").trim();

    if (!message || message.length < 5) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > 5000) {
      return res.status(413).json({ error: "Message too long" });
    }

    await ContactMessage.create({
      id: await nextId("contact_messages"),
      name,
      email,
      subject,
      message,
    });

    return res.json({ Status: "Success" });
  } catch (err) {
    console.error("CONTACT ERROR:", err);
    return res.status(500).json({ error: "Failed to submit message" });
  }
});

//idint = 5;
app.post("/signup", async (req, res) => {
  const saltRounds = 10;

  try {
    if (!process.env.MONGO_URI) {
      return res.status(503).json({ Message: "Server not configured (MONGO_URI missing)" });
    }
    if (mongoose.connection.readyState !== 1) {
      const detail =
        process.env.NODE_ENV === "production"
          ? ""
          : (mongoLastError?.message ? `: ${mongoLastError.message}` : "");
      return res.status(503).json({ Message: `Database not connected${detail}` });
    }

    if (await checkPrevRecord(req)) {
      // console.log("LA")
      return res.json({ Message: "Already Registered" });
    } else {
      console.log("AL");
      const hashedPassword = await bcrypt.hash(req.body.password.toString(), 9);

       try {
         await User.create({
           id: await nextId("users"),
           name: req.body.name,
           email: req.body.email,
           password: hashedPassword,
           token: null,
         });
         return res.json({ Status: "Success" });
       } catch (err) {
         if (err && err.code === 11000) {
           return res
             .status(409)
             .json({ Message: "Username or Email already exists" });
         }
         console.error(err);
         return res.status(500).json({
           Message:
             process.env.NODE_ENV === "production"
               ? "Server Error"
               : `Server Error: ${err?.message || "unknown error"}`,
         });
       }
     }
   } catch (err) {
     console.error(err);
     return res.status(500).json({
       Message:
         process.env.NODE_ENV === "production"
           ? "Server Error"
           : `Server Error: ${err?.message || "unknown error"}`,
     });
   }
});

async function checkPrevRecord(req) {
  console.log("data");
  const existing = await User.findOne({ email: req.body.email }).select({ id: 1 });
  return !!existing;
}

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  //console.log(req)

  if (!token) {
    return res.json({ Message: "We need token Provoide it..." });
  } else {
    jwt.verify(token, JWT_SECRET, (err, decode) => {
      if (err) {
        return res.json({ Message: "Authentication error" });
      } else {
        req.name = decode.name;

        next();
      }
    });
  }
};
app.get("/", verifyUser, async (req, res) => {
  try {
    return res.json({ Status: "Success", name: req.name });
  } catch (err) {
    return res.json({ Message: "Server Error" });
  }
});

// Deployment-friendly auth check endpoint (avoids conflicting with SPA "/" route on the frontend host).
app.get("/auth", verifyUser, async (req, res) => {
  try {
    return res.json({ Status: "Success", name: req.name });
  } catch (err) {
    return res.json({ Message: "Server Error" });
  }
});

async function updateToken(email, token) {
  await User.updateOne({ email }, { $set: { token } });
}

// app.post("/login", (req, res) => {
//   const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
//   const values = [req.body.email, req.body.password];
//   db.query(sql, [req.body.email, req.body.password], (err, data) => {
//     if (err) {
//       console.log(err + "H");
//       return res.json("Error");
//     }
//     if (data.length > 0) {
//       // console.log("Done");
//       // return res.json("Login Done!");
//       const name = data[0].name;
//       const token = jwt.sign({ name }, "secret-key", { expiresIn: "1d" });
//       res.cookie("token", token);

//       updateToken(values[0], token);

//       //const sql2 = "UPDATE users SET token=? where email=?";

//       // const otherValues=[
//       //     token,
//       //     values[0]
//       // ];
//       // console.log(otherValues)
//       // db.query(sql2, [token, values[0]], (err, data) =>{
//       //     //console.log(values);
//       //     if(err){
//       //         console.log(err + "H");
//       //         return res.json("Error");
//       //     }
//       //     console.log(data + "H");
//       //     return res.json(data);
//       // });
//       return res.json({ Status: "Success" });
//     } else {
//       console.log(data);
//       return res.json({ Message: "No Record... Signup!" });
//     }
//   });
// });
app.post("/login", async (req, res) => {
  const values = [req.body.email];
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      console.log("", []);
      return res.json({ Message: "No Record... Signup!" });
    }

    const validPassword = await bcrypt.compare(
      req.body.password.toString(),
      user.password
    );

    if (validPassword) {
      console.log("YEeY validpass");
      const token = jwt.sign({ name: user.name }, JWT_SECRET, { expiresIn: "1d" });
      res.cookie("token", token, cookieOptions());
      await updateToken(values[0], token);
      return res.json({ Status: "Success" });
    } else {
      console.log(
        "NO>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
      );
      return res.json({ Message: "Invalid email or password" });
    }
  } catch (err) {
    console.log(err + "H");
    return res.json("Error");
  }
});

async function checkPass(req, res, values) {
  try {
    const user = await User.findOne({ password: req.body.password });
    if (user) {
      const token = jwt.sign({ name: user.name }, JWT_SECRET, { expiresIn: "1d" });
      res.cookie("token", token, cookieOptions());
      await updateToken(values[0], token);
      return res.json({ Status: "Success" });
    } else {
      console.log([]);
      return res.json({ Message: "Wrong Password!" });
    }
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
}

app.get("/logout", async (req, res) => {
  try {
    res.clearCookie("token", cookieOptions());
    return res.json({ Status: "Success" });
  } catch (err) {
    return res.json({ Message: "Server Error" });
  }
});

async function get_author_id(token) {
  const user = await User.findOne({ token }).select({ id: 1 });
  if (!user) {
    throw new Error("No user found for the provided token");
  }
  return user.id;
}

// app.post("/question", async (req, res) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return res.json({ Message: "We need token Provoide it..." });
//   }

//   try {
//     const authorId = await get_author_id(token);

//     const sql =
//       "INSERT INTO questions(title, content, author_id, image_url) VALUES(?)";
//     const values = [req.body.title, req.body.question, authorId, req.body.url];

//     db.query(sql, [values], (err, data) => {
//       if (err) {
//         console.error(err);
//         return res.json("Error");
//       }
//       console.log(data);
//       return res.json(data);
//     });
//   } catch (error) {
//     console.error(error);
//     return res.json("Error");
//   }
// });

// Adding tags  
app.post("/question", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token. Please provide it." });
  }

  try {
    const authorId = await get_author_id(token);

    let question;
    try {
      question = await Question.create({
        id: await nextId("questions"),
        title: req.body.title,
        content: req.body.question,
        author_id: authorId,
        image_url: req.body.url,
      });
    } catch (err) {
      console.error(err);
      return res.json("Error inserting question");
    }

    const questionId = question.id;

    if (!req.body.tags || req.body.tags.length === 0) {
      return res.json({ success: true, questionId });
    }

    const tags = req.body.tags;
    try {
      for (const tagName of tags) {
        const existing = await Tag.findOne({ name: tagName }).select({ id: 1 });
        if (!existing) {
          try {
            await Tag.create({ id: await nextId("tags"), name: tagName });
          } catch (err) {
            if (!(err && err.code === 11000)) {
              throw err;
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      return res.json("Error inserting tags");
    }

    let tagDocs;
    try {
      tagDocs = await Tag.find({ name: { $in: tags } }).select({ id: 1 });
    } catch (err) {
      console.error(err);
      return res.json("Error retrieving tag IDs");
    }

    try {
      const questionTags = [];
      for (const tagDoc of tagDocs) {
        questionTags.push({
          id: await nextId("question_tags"),
          question_id: questionId,
          tag_id: tagDoc.id,
        });
      }
      if (questionTags.length > 0) {
        await QuestionTag.insertMany(questionTags);
      }
      return res.json({ success: true, questionId });
    } catch (err) {
      console.error(err);
      return res.json("Error linking tags to question");
    }
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});



// app.post('/question', (req, res) =>{
//     const token = req.cookies.token;
//     // console.log(token)
//     if(!token){
//         console.log("login!");
//         return res.json({Message: "We need token Provoide it..."})
//     }else{
//         the_id=-1;
//         get_author_id(token, the_id);
//     }
//     console.log(the_id)
//     const sql = "INSERT INTO questions(title, content, author_id) VALUES(?)";
//         const values =[
//             req.body.title,
//             req.body.content,
//             the_id
//         ]
//         db.query(sql, [values], (err, data) =>{
//             //console.log(values);
//             if(err){
//                 console.log(err + "H");
//                 return res.json("Error");
//             }
//             console.log(data + "H");
//             return res.json(data);
//         })
// })

app.get("/allquestions", async (req, res) => {
  try {
    const data = await Question.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

async function updateVote(req, newValue, existingVoteid, existingvotevalue) {
  const updateResult = await Vote.updateOne(
    { id: existingVoteid },
    { $set: { value: newValue } }
  );
  await updateRating(req, existingvotevalue, newValue);
  console.log(updateResult);
  return updateResult;
}

async function addVote(req, user_id, target_id, vote_type, is_comment) {
  const voteDoc = {
    id: await nextId("votes"),
    user_id,
    value: vote_type,
    question_id: is_comment ? null : target_id,
    comment_id: is_comment ? target_id : null,
  };
  const insertResult = await Vote.create(voteDoc);
  await addRating(req);
  console.log(insertResult);
  return insertResult;
}
async function addRating(req) {
  // add rating
  const insertResult = await Question.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: req.body.vote_type } }
  );
  console.log(insertResult);
  return insertResult;
}

async function updateRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  const delta = -existingvalue + newValue;
  const insertResult = await Question.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: delta } }
  );
  console.log(insertResult);
  return insertResult;
}

app.post("/vote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const isComment = req.body.is_comment;
  console.log(req);

  try {
    const user_id = await get_author_id(token);
    console.log("---------" + user_id);

    const filter = { user_id };
    if (isComment) {
      filter.comment_id = req.body.target_id;
    } else {
      filter.question_id = req.body.target_id;
    }

    const results = await Vote.find(filter);
    console.log("***********" + results);

    if (results.length > 0) {
      const existingVote = results[0];
      const existingVoteJson = [existingVote.toJSON()];
      const newValue =
        existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
      console.log("U");
      try {
        await updateVote(req, newValue, existingVote.id, existingVote.value);
        return res.json(existingVoteJson);
      } catch (updateError) {
        console.error(updateError);
        return res.json("Error updating vote");
      }
    } else {
      console.log("i");
      try {
        await addVote(req, user_id, req.body.target_id, req.body.vote_type, isComment);
        return res.json("done");
      } catch (addError) {
        console.error(addError);
        return res.json("Error adding vote");
      }
    }
  } catch (error) {
    console.error(error);
    return res.json("Error querying database");
  }
});

app.post("/uservote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    const votes = await Vote.find({
      question_id: req.body.target_id,
      user_id,
    }).select({ value: 1 });
    return res.json(votes.map((v) => ({ value: v.value })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/questionrating", async (req, res) => {
  try {
    const questions = await Question.find({ id: req.body.target_id }).select({
      rating: 1,
    });
    return res.json(questions.map((q) => ({ rating: q.rating })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/comment", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provoide it..." });
  }

  try {
    const authorId = await get_author_id(token);
    await Comment.create({
      id: await nextId("comments"),
      content: req.body.comment_content,
      user_id: authorId,
      question_id: req.body.question_id,
    });
    return res.json({ Status: "Success" });
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/allcomments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await Comment.find({ question_id: id });
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.post("/commentrating", async (req, res) => {
  const targetIds = req.body.target_ids;
  try {
    const comments = await Comment.find({ id: { $in: targetIds } }).select({
      rating: 1,
    });
    return res.json(comments.map((c) => ({ rating: c.rating })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/usercommentvote", async (req, res) => {
  const targetIds = req.body.target_ids;

  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    const votes = await CommentVote.find({
      comment_id: { $in: targetIds },
      user_id,
    }).select({ value: 1 });
    return res.json(votes.map((v) => ({ value: v.value })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

async function updatecommVote(req, newValue, existingVoteid, existingVotevalue) {
  const updateResult = await CommentVote.updateOne(
    { id: existingVoteid },
    { $set: { value: newValue } }
  );
  await updatecommRating(req, existingVotevalue, newValue);
  console.log(updateResult);
  return updateResult;
}

async function addcommVote(req, user_id, target_id, vote_type, is_comment) {
  const insertResult = await CommentVote.create({
    id: await nextId("comment_votes"),
    user_id,
    comment_id: target_id,
    value: vote_type,
  });
  await addcommRating(req);
  console.log(insertResult);
  return insertResult;
}
async function addcommRating(req) {
  // add rating
  const insertResult = await Comment.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: req.body.vote_type } }
  );
  console.log(insertResult);
  return insertResult;
}

async function updatecommRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  const delta = -existingvalue + newValue;
  const insertResult = await Comment.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: delta } }
  );
  console.log(insertResult);
  return insertResult;
}

app.post("/commentvote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  const isComment = req.body.is_comment;
  console.log(req);

  try {
    const user_id = await get_author_id(token);
    console.log("---------" + user_id);

    const results = await CommentVote.find({
      user_id,
      comment_id: req.body.target_id,
    });
    console.log("***********" + results);

    if (results.length > 0) {
      const existingVote = results[0];
      const existingVoteJson = [existingVote.toJSON()];
      const newValue =
        existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
      console.log("U");

      try {
        await updatecommVote(req, newValue, existingVote.id, existingVote.value);
        return res.json(existingVoteJson);
      } catch (updateError) {
        console.error(updateError);
        return res.json("Error updating vote");
      }
    } else {
      console.log("i");
      try {
        await addcommVote(req, user_id, req.body.target_id, req.body.vote_type, isComment);
        return res.json("done");
      } catch (addError) {
        console.error(addError);
        return res.json("Error adding vote");
      }
    }
  } catch (error) {
    console.error(error);
    return res.json("Error querying database");
  }
});

app.get("/allcomments", async (req, res) => {
  try {
    const data = await Comment.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/userInfo", async (req, res) => {
  const targetIds = req.body.target_ids;

  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const data = await User.find({ token }).select({
      id: 1,
      name: 1,
      email: 1,
      password: 1,
      token: 1,
    });
    return res.json(data);
  } catch (err) {
    console.log(err + "H");
    return res.json("Error");
  }
});



app.get("/allnotes", async (req, res) => {
  console.log("ds");
  try {
    const data = await Note.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});


app.post("/noteupload", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication token not provided." });
  }

  try {
    const authorId = await get_author_id(token);
    try {
      const result = await Note.create({
        id: await nextId("notes"),
        course_name: req.body.course_name,
        semester: req.body.semester,
        prof_name: req.body.prof_name,
        course_description: req.body.course_description,
        author_id: authorId,
        votes: 0,
        pdf: req.body.pdf_url,
        file_name: req.body.file_name,
        file_size: req.body.file_size,
      });
      console.log("Note inserted successfully:", result);
      return res.status(200).json({ message: "Note uploaded successfully." });
    } catch (err) {
      console.error("Error inserting note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting note into database." });
    }
  } catch (error) {
    console.error("Error uploading note:", error);
    return res.status(500).json({ message: "Error uploading note." });
  }
});


async function get_user_name(id) {
  const user = await User.findOne({ id }).select({ name: 1 });
  if (!user) {
    throw new Error("No user found for the provided id");
  }
  return user.name;
}


app.post("/username", async (req, res) => {
  console.log("request ", req);
  const id = req.body.id;
  if (id === undefined) {
    return res.json(null);
  }
  try {
    const name = await get_user_name(id);
    console.log("get_user_name ", name);
    return res.json(name);
  } catch (err) {
    console.error(err);
    return res.json(null);
  }
  // try {
  //   const username = get_user_name(id);
  //   console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&s", username)
  //   return res.json(username);
  // } catch (error) {
  //   console.error(error);
  //   return res.json("Error");
  // }
});


// app.get('/pdf-preview/:filename', async (req, res) => {
//   const pdfPath = path.join(__dirname, 'pdfs', req.params.filename); // Adjust the path as necessary

//   if (!fs.existsSync(pdfPath)) {
//     return res.status(404).send('PDF not found');
//   }

//   const outputPath = path.join(__dirname, 'previews', `${path.basename(req.params.filename, '.pdf')}.png`);

//   if (!fs.existsSync(outputPath)) {
//     try {
//       await poppler.convert(pdfPath, {
//         format: 'png',
//         out_dir: path.join(__dirname, 'previews'),
//         out_prefix: path.basename(req.params.filename, '.pdf'),
//         page: 1
//       });
//     } catch (error) {
//       return res.status(500).send('Error generating preview');
//     }
//   }

//   res.sendFile(outputPath);
// });




async function notes_updateVote(req, newValue, existingVoteid, existingvotevalue) {
  const updateResult = await NoteVote.updateOne(
    { id: existingVoteid },
    { $set: { value: newValue } }
  );
  await notes_updateRating(req, existingvotevalue, newValue);
  return updateResult;
}

async function notes_addVote(req, user_id, target_id, vote_type, is_comment) {
  const insertResult = await NoteVote.create({
    id: await nextId("note_vote"),
    user_id,
    note_id: target_id,
    value: vote_type,
  });
  await notes_addRating(req);
  return insertResult;
}
async function notes_addRating(req) {
  // add rating
  const insertResult = await Note.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: req.body.vote_type } }
  );
  return insertResult;
}

async function notes_updateRating(req, existingvalue, newValue) {
  // rating - existingvalue + newValue
  const delta = -existingvalue + newValue;
  const insertResult = await Note.updateOne(
    { id: req.body.target_id },
    { $inc: { rating: delta } }
  );
  return insertResult;
}


app.post("/noterating", async (req, res) => {
  try {
    const notes = await Note.find({ id: req.body.target_id }).select({ rating: 1 });
    return res.json(notes.map((n) => ({ rating: n.rating })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/noteuservote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    const votes = await NoteVote.find({
      note_id: req.body.target_id,
      user_id,
    }).select({ value: 1 });
    return res.json(votes.map((v) => ({ value: v.value })));
  } catch (err) {
    console.error(err);
    return res.json("Error");
  }
});

app.post("/notevote", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  console.log(req);

  try {
    const user_id = await get_author_id(token);
    console.log("---------" + user_id);

    const results = await NoteVote.find({ user_id, note_id: req.body.target_id });
    if (results.length > 0) {
      const existingVote = results[0];
      const existingVoteJson = [existingVote.toJSON()];
      const newValue =
        existingVote.value === req.body.vote_type ? 0 : req.body.vote_type;
      console.log("U");
      try {
        await notes_updateVote(req, newValue, existingVote.id, existingVote.value);
        return res.json(existingVoteJson);
      } catch (updateError) {
        console.error(updateError);
        return res.json("Error updating vote");
      }
    } else {
      console.log("i");
      try {
        await notes_addVote(req, user_id, req.body.target_id, req.body.vote_type);
        return res.json("done");
      } catch (addError) {
        console.error(addError);
        return res.json("Error adding vote");
      }
    }
  } catch (error) {
    console.error(error);
    return res.json("Error querying database");
  }
});



app.post("/question_marked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedQuestion.create({
        id: await nextId("marked_questions"),
        user_id,
        question_id: req.body.question_id,
      });
      console.log("marked que inserted successfully:", result);
      return res.status(200).json({ message: "marked que uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked question into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked que into database." });
    }
  } catch (error) {
    console.error("Error uploading marked que:", error);
    return res.status(500).json({ message: "Error inserting marked que into database." });
  }
});
app.post("/note_marked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedNote.create({
        id: await nextId("marked_notes"),
        user_id,
        note_id: req.body.note_id,
      });
      console.log("marked note inserted successfully:", result);
      return res.status(200).json({ message: "marked note uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked note into database." });
    }
  } catch (error) {
    console.error("Error uploading marked note:", error);
    return res
      .status(500)
      .json({ message: "Error inserting marked note into database." });
  }
});
app.post("/question_unmarked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedQuestion.deleteMany({
        user_id,
        question_id: req.body.question_id,
      });
      console.log("marked que inserted successfully:", result);
      return res.status(200).json({ message: "marked que uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked question into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked que into database." });
    }
  } catch (error) {
    console.error("Error uploading marked que:", error);
    return res.status(500).json({ message: "Error inserting marked que into database." });
  }
});
app.post("/note_unmarked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  
  try {
    const user_id = await get_author_id(token);
    try {
      const result = await MarkedNote.deleteMany({
        user_id,
        note_id: req.body.note_id,
      });
      console.log("marked note inserted successfully:", result);
      return res.status(200).json({ message: "marked note uploaded successfully." });
    } catch (err) {
      console.error("Error inserting marked note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked note into database." });
    }
  } catch (error) {
    console.error("Error uploading marked note:", error);
    return res
      .status(500)
      .json({ message: "Error inserting marked note into database." });
  }
});
app.post("/ismarked", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    try {
      const exists = await MarkedQuestion.exists({
        user_id,
        question_id: req.body.question_id,
      });
      const result = [{ row_exists: exists ? 1 : 0 }];
      console.log("marked que inserted successfully:", result);
      return res.status(200).json({ result });
    } catch (err) {
      console.error("Error inserting marked question into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked que into database." });
    }
  } catch (error) {
    console.error("Error uploading marked que:", error);
    return res.status(500).json({ message: "Error inserting marked que into database." });
  }
});
app.post("/ismarkednote", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }
  try {
    const user_id = await get_author_id(token);
    try {
      const exists = await MarkedNote.exists({
        user_id,
        note_id: req.body.note_id,
      });
      const result = [{ row_exists: exists ? 1 : 0 }];
      console.log("marked note inserted successfully:", result);
      return res.status(200).json({ result });
    } catch (err) {
      console.error("Error inserting marked note into database:", err);
      return res
        .status(500)
        .json({ message: "Error inserting marked note into database." });
    }
  } catch (error) {
    console.error("Error uploading marked note:", error);
    return res
      .status(500)
      .json({ message: "Error inserting marked note into database." });
  }
});

//tags search
app.get("/alltags", async (req, res) => {
  try {
    const data = await Tag.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});
app.get("/question_tags", async (req, res) => {
  try {
    const data = await QuestionTag.find({});
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.json("Error");
  }
});

app.get("/questionswithtag", async (req, res) => {
  const tagId = req.query.target_id; // Retrieve tag_id from the query parameters
  
  try {
    const results = await QuestionTag.find({ tag_id: tagId }).select({ question_id: 1 });
    return res.json(results.map((r) => ({ question_id: r.question_id })));
  } catch (err) {
    console.error("Error fetching questions:", err);
    return res.status(500).send("Server error");
  }
});

app.get("/questionswithuserid", async (req, res) => {
  const tagId = req.query.user_id; // Retrieve tag_id from the query parameters
  
  try {
    const results = await QuestionTag.find({ author_id: tagId }).select({ question_id: 1 });
    return res.json(results.map((r) => ({ question_id: r.question_id })));
  } catch (err) {
    console.error("Error fetching questions:", err);
    return res.status(500).send("Server error");
  }
});


app.get("/questionwithIDs", async (req, res) => {
  let questionIds = req.query.ids; // here there will be an array of question IDs

  if (!questionIds || questionIds.length === 0) {
    return res.status(400).json({ error: "No question IDs provided" });
  }

  if (typeof questionIds === "string") {
    questionIds = questionIds.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(questionIds)) {
    questionIds = [questionIds];
  }

  try {
    const results = await Question.find({ id: { $in: questionIds } });
    return res.json(results);
  } catch (err) {
    console.error("Error fetching questions:", err);
    return res.status(500).send("Server error");
  }
});

app.get("/top-questions", async (req, res) => {
  try {
    const results = await Question.find({}).sort({ rating: -1 }).limit(10);
    return res.json(results);
  } catch (err) {
    console.error("Error fetching top questions:", err);
    return res.status(500).send("Server error");
  }
});

app.get("/top-notes", async (req, res) => {
  try {
    const results = await Note.find({}).sort({ rating: -1 }).limit(6);
    return res.json(results);
  } catch (err) {
    console.error("Error fetching top questions:", err);
    return res.status(500).send("Server error");
  }
});


// Define the route to fetch questions by user_id
app.get('/api/questions/user/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const results = await Question.find({ author_id: userId });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});
app.get('/api/notes/user/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const results = await Note.find({ author_id: userId });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
});


app.get('/api/questions/liked/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const votes = await Vote.find({ user_id: userId, value: 1 }).select({
      question_id: 1,
    });
    const questionIds = votes.map((v) => v.question_id).filter((id) => id != null);
    const results = await Question.find({ id: { $in: questionIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
});
app.get('/api/questions/marked', async (req, res) => {
  
  const token = req.cookies.token;
  {
    if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }

  const user_id =  await get_author_id(token);
  try {
    const marked = await MarkedQuestion.find({ user_id }).select({ question_id: 1 });
    const questionIds = marked.map((m) => m.question_id).filter((id) => id != null);
    const results = await Question.find({ id: { $in: questionIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
  }
});
app.get('/api/notes/marked', async (req, res) => {
  
  const token = req.cookies.token;
  {
    if (!token) {
    return res.json({ Message: "We need token Provide it..." });
  }

  const user_id =  await get_author_id(token);
  try {
    const marked = await MarkedNote.find({ user_id }).select({ note_id: 1 });
    const noteIds = marked.map((m) => m.note_id).filter((id) => id != null);
    const results = await Note.find({ id: { $in: noteIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
  }
});
app.get('/api/notes/liked/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const votes = await NoteVote.find({ user_id: userId, value: 1 }).select({
      note_id: 1,
    });
    const noteIds = votes.map((v) => v.note_id).filter((id) => id != null);
    const results = await Note.find({ id: { $in: noteIds } });
    return res.json(results);
  } catch (error) {
    console.error('Error fetching liked questions:', error);
    return res.status(500).json({ error: 'Failed to fetch liked questions' });
  }
});

app.get('/api/tags/:questionId', async (req, res) => {
  try {
      const questionId = req.params.questionId;
      const links = await QuestionTag.find({ question_id: questionId }).select({
        tag_id: 1,
      });
      const tagIds = links.map((l) => l.tag_id).filter((id) => id != null);
      const tags = await Tag.find({ id: { $in: tagIds } }).select({ id: 1, name: 1 });
      const results = tags.map((t) => ({ tag_id: t.id, tag_name: t.name }));
      return res.json(results);  // only results are sent as JSON
  } catch (error) {
      return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/answers/count/:questionId', async (req, res) => {
  const questionId = req.params.questionId;
  try {
      const count = await Comment.countDocuments({ question_id: questionId });
      return res.json({ answer_count: count }); // Returning the count result
  } catch (error) {
      return res.status(500).json({ error: 'Server error' });
  }
});




class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  acquire() {
    if (this.current < this.max) {
      this.current += 1;
      return Promise.resolve(() => this.release());
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    }).then(() => {
      this.current += 1;
      return () => this.release();
    });
  }

  release() {
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const PROCESSPDF_CONCURRENCY = (() => {
  const parsed = parseInt(process.env.PROCESSPDF_CONCURRENCY || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
})();
const processPdfSemaphore = new Semaphore(PROCESSPDF_CONCURRENCY);

const processPdfRateLimit = createRateLimiter({
  windowMs: parseInt(process.env.PROCESSPDF_RATE_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.PROCESSPDF_RATE_MAX || "10", 10),
});

function processPdfConcurrency(req, res, next) {
  processPdfSemaphore
    .acquire()
    .then((release) => {
      let released = false;
      const safeRelease = () => {
        if (released) return;
        released = true;
        release();
      };
      req._processPdfRelease = safeRelease;
      res.once("finish", safeRelease);
      res.once("close", safeRelease);
      next();
    })
    .catch(next);
}

async function rmrf(dirPath) {
  if (!dirPath) return;
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function downloadPdfUrlToPath(pdfUrl, destPath, maxBytes) {
  const response = await axios.get(pdfUrl, {
    responseType: "stream",
    withCredentials: false,
    timeout: 15_000,
    maxRedirects: 3,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    const err = new Error(`Failed to fetch PDF (status ${response.status})`);
    err.statusCode = 502;
    throw err;
  }

  const contentLength = parseInt(response.headers?.["content-length"] || "0", 10);
  if (contentLength && Number.isFinite(contentLength) && contentLength > maxBytes) {
    const err = new Error("Remote PDF exceeds size limit");
    err.statusCode = 413;
    throw err;
  }

  let downloaded = 0;
  const limiter = new Transform({
    transform(chunk, encoding, cb) {
      downloaded += chunk.length;
      if (downloaded > maxBytes) {
        const err = new Error("Remote PDF exceeds size limit");
        err.statusCode = 413;
        return cb(err);
      }
      return cb(null, chunk);
    },
  });

  try {
    await pipeline(response.data, limiter, fs.createWriteStream(destPath, { flags: "wx" }));
  } catch (err) {
    try {
      await fs.promises.unlink(destPath);
    } catch {
      // ignore
    }
    throw err;
  }

  return {
    contentType: response.headers?.["content-type"] || "application/pdf",
    bytes: downloaded,
  };
}

function processPdfUpload(req, res, next) {
  upload.array("pdfFiles")(req, res, async (err) => {
    if (!err) return next();

    const reqDir = path.join(UPLOAD_TMP_DIR, String(req.id || "noid"));
    await rmrf(reqDir);

    const code = err?.code;
    const status =
      code === "LIMIT_FILE_SIZE" || code === "LIMIT_FILE_COUNT" ? 413 : err?.statusCode || 400;
    const message =
      code === "LIMIT_FILE_SIZE"
        ? `PDF too large (max ${MAX_UPLOAD_BYTES} bytes)`
        : code === "LIMIT_FILE_COUNT"
          ? `Too many PDFs (max ${MAX_UPLOAD_FILES})`
          : err?.message || "Invalid upload";

    return res.status(status).json({ error: message, stage: "upload", code });
  });
}

const processPdfHandler = async (req, res) => {
  const reqDir = path.join(UPLOAD_TMP_DIR, String(req.id || "noid"));

  try {
    const url = req.body?.url;
    const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];

    const pdfInputs = [];
    let sourceUrls = null;
    if (files.length > 0) {
      for (const file of files) {
        if (!file?.path) continue;
        pdfInputs.push({
          path: file.path,
          filename: file.originalname || path.basename(file.path),
          contentType: file.mimetype || "application/pdf",
        });
      }
    } else if (url) {
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid PDF URL" });
      }
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ error: "Invalid URL protocol" });
      }

      if (PROCESSPDF_SOURCE_URL_ENABLE) {
        sourceUrls = [url];
      } else {
        try {
          await fs.promises.mkdir(reqDir, { recursive: true });
        } catch {
          // ignore
        }

        const filename = path.basename(parsed.pathname || "file.pdf") || "file.pdf";
        const destPath = path.join(
          reqDir,
          `url-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`,
        );

        try {
          try {
            const dl = await downloadPdfUrlToPath(url, destPath, MAX_UPLOAD_BYTES);
            pdfInputs.push({
              path: destPath,
              filename,
              contentType: dl.contentType,
            });
          } catch (err) {
            console.error("FETCH PDF ERROR:", err);
            const status = err?.statusCode || (err?.code === "ETIMEDOUT" ? 504 : 502);
            return res.status(status).json({
              error: err?.message || "Failed to fetch PDF",
              stage: "fetch_pdf",
              code: err?.code,
            });
          }
        } catch (err) {
          console.error("FETCH PDF ERROR:", err);
          const status = err?.statusCode || (err?.code === "ETIMEDOUT" ? 504 : 502);
          return res.status(status).json({
            error: err?.message || "Failed to fetch PDF",
            stage: "fetch_pdf",
            code: err?.code,
          });
        }
      }
    } else {
      return res.status(400).json({
        error: "No PDF uploaded",
        hint: "Send multipart/form-data with field name 'pdfFiles' or send JSON with { url }.",
      });
    }

    if (pdfInputs.length === 0 && !sourceUrls) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    let response;
    try {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const isRetryable = (err) => {
        const code = err?.code;
        if (
          code === "ECONNRESET" ||
          code === "ETIMEDOUT" ||
          code === "ECONNABORTED" ||
          code === "EPIPE" ||
          code === "ENOTFOUND" ||
          code === "ECONNREFUSED" ||
          code === "ERR_BAD_RESPONSE"
        ) {
          return true;
        }
        const message = (err?.message || "").toLowerCase();
        if (message.includes("socket hang up") || message.includes("stream has been aborted")) return true;
        return false;
      };
      const retryableUpstreamStatuses = new Set(
        String(process.env.PYTHON_PROCESS_PDF_RETRY_STATUS_CODES || "502,503,504")
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n)),
      );
      const isRetryableStatus = (status) =>
        Number.isFinite(status) && retryableUpstreamStatuses.has(status);

      const buildFormData = async () => {
        const formData = new FormData();
        for (const part of pdfInputs) {
          const stat = await fs.promises.stat(part.path);
          formData.append("pdfFiles", fs.createReadStream(part.path), {
            filename: part.filename,
            contentType: part.contentType,
            knownLength: stat.size,
          });
        }

        const headers = formData.getHeaders();
        if (req.id) headers["x-request-id"] = req.id;
        try {
          const contentLength = await new Promise((resolve, reject) => {
            formData.getLength((e, length) => {
              if (e) return reject(e);
              return resolve(length);
            });
          });
          if (Number.isFinite(contentLength)) headers["Content-Length"] = contentLength;
        } catch {
          // If we can't compute it, fall back to Transfer-Encoding: chunked.
        }

        return { formData, headers };
      };

      const pythonProcessPdfUrl = `${PYTHON_BASE_URL}/process_pdf${PYTHON_PROCESS_PDF_ASYNC ? "?async=1" : ""}`;

      const postJson = async (payload) => {
        const headers = { "Content-Type": "application/json" };
        if (req.id) headers["x-request-id"] = req.id;
        return axios.post(pythonProcessPdfUrl, payload, {
          headers,
          timeout: PYTHON_PROCESS_PDF_TIMEOUT_MS,
          maxContentLength: 2 * 1024 * 1024,
          maxBodyLength: 256 * 1024,
          validateStatus: () => true,
        });
      };

      // Prefer URL-based ingestion (small JSON request) to avoid multipart aborts on low-tier hosting.
      if (PROCESSPDF_SOURCE_URL_ENABLE) {
        let sourceUrlsToSend = sourceUrls;

        if (!sourceUrlsToSend && pdfInputs.length > 0 && files.length > 0) {
          const baseUrl = getPublicBaseUrl(req);
          if (baseUrl) {
            sourceUrlsToSend = [];
            for (const part of pdfInputs) {
              const reg = await registerProcessPdfSourceFile({
                filePath: part.path,
                filename: part.filename,
                contentType: part.contentType,
              });
              part.path = reg.path; // keep multipart fallback possible
              sourceUrlsToSend.push(`${baseUrl}/processpdf/source/${reg.token}`);
            }
          } else {
            console.warn("PUBLIC_BASE_URL missing; cannot use source_url mode for uploaded PDFs.");
          }
        }

        if (sourceUrlsToSend && sourceUrlsToSend.length > 0) {
          const payload =
            sourceUrlsToSend.length === 1
              ? { source_url: sourceUrlsToSend[0] }
              : { source_urls: sourceUrlsToSend };

          let attempt = 0;
          const maxAttempts = Math.max(1, PYTHON_PROCESS_PDF_RETRIES + 1);
          while (attempt < maxAttempts) {
            try {
              const r = await postJson(payload);
              if (isRetryableStatus(r?.status) && attempt < maxAttempts - 1) {
                attempt += 1;
                const backoffMs = Math.min(10_000, 750 * Math.pow(2, attempt - 1));
                console.warn(`Retrying ${pythonProcessPdfUrl} after upstream status ${r?.status}`);
                await sleep(backoffMs);
                continue;
              }
              response = r;
              break;
            } catch (err) {
              attempt += 1;
              if (attempt >= maxAttempts || !isRetryable(err)) throw err;
              const backoffMs = Math.min(10_000, 750 * Math.pow(2, attempt - 1));
              console.warn(
                `Retrying ${pythonProcessPdfUrl} after error (${err?.code || "unknown"}): ${err?.message || ""}`,
              );
              await sleep(backoffMs);
            }
          }

          // Back-compat: old Python builds only accept multipart.
          const maybeMsg = response?.data?.error;
          if (
            response?.status === 400 &&
            typeof maybeMsg === "string" &&
            maybeMsg.toLowerCase().includes("no pdf")
          ) {
            response = null;
          }
        }
      }

      if (!response) {
        // If we skipped downloading a URL because source_url mode was enabled but the Python build is old,
        // fall back to downloading+multipart.
        if (url && pdfInputs.length === 0) {
          let parsed;
          try {
            parsed = new URL(url);
          } catch {
            return res.status(400).json({ error: "Invalid PDF URL" });
          }

          try {
            await fs.promises.mkdir(reqDir, { recursive: true });
          } catch {
            // ignore
          }

          const filename = path.basename(parsed.pathname || "file.pdf") || "file.pdf";
          const destPath = path.join(
            reqDir,
            `url-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`,
          );
          const dl = await downloadPdfUrlToPath(url, destPath, MAX_UPLOAD_BYTES);
          pdfInputs.push({
            path: destPath,
            filename,
            contentType: dl.contentType,
          });
        }

        let attempt = 0;
        const maxAttempts = Math.max(1, PYTHON_PROCESS_PDF_RETRIES + 1);
        while (attempt < maxAttempts) {
          try {
            const { formData, headers } = await buildFormData();
            const r = await axios.post(pythonProcessPdfUrl, formData, {
              headers,
              timeout: PYTHON_PROCESS_PDF_TIMEOUT_MS,
              maxContentLength: 2 * 1024 * 1024, // protect Node from large upstream responses
              // Request size is already capped by multer (uploads) / download limiter (URLs).
              // Keep axios' maxBodyLength unlimited to avoid aborting valid multipart requests.
              maxBodyLength: Infinity,
              validateStatus: () => true,
            });
            if (isRetryableStatus(r?.status) && attempt < maxAttempts - 1) {
              attempt += 1;
              const backoffMs = Math.min(10_000, 750 * Math.pow(2, attempt - 1));
              console.warn(`Retrying ${pythonProcessPdfUrl} after upstream status ${r?.status}`);
              await sleep(backoffMs);
              continue;
            }
            response = r;
            break;
          } catch (err) {
            attempt += 1;
            if (attempt >= maxAttempts || !isRetryable(err)) throw err;
            const backoffMs = Math.min(10_000, 750 * Math.pow(2, attempt - 1));
            console.warn(
              `Retrying ${pythonProcessPdfUrl} after error (${err?.code || "unknown"}): ${err?.message || ""}`,
            );
            await sleep(backoffMs);
          }
        }
      }
    } catch (err) {
      console.error("PYTHON /process_pdf ERROR:", err);
      const code = err?.code;
      const rawMessage = err?.message;
      const target = `${PYTHON_BASE_URL}/process_pdf${PYTHON_PROCESS_PDF_ASYNC ? "?async=1" : ""}`;
      const message =
        rawMessage && rawMessage !== "Error"
          ? rawMessage
          : `PDF processor unreachable${code ? ` (${code})` : ""}`;
      const status = code === "ETIMEDOUT" || code === "ECONNABORTED" ? 504 : 503;
      return res.status(status).json({
        error: message,
        stage: "python_process_pdf",
        code,
        target,
        timeout_ms: PYTHON_PROCESS_PDF_TIMEOUT_MS,
        hint: `Set PYTHON_BASE_URL to your deployed Python service (currently: ${PYTHON_BASE_URL || "unset"})`,
      });
    }

    if (response.status >= 200 && response.status < 300) {
      return res.status(response.status).json(response.data);
    }

    const upstreamContentType = response?.headers?.["content-type"];
    const upstreamData = response?.data;
    let upstreamBodyPreview = null;
    try {
      if (typeof upstreamData === "string") upstreamBodyPreview = upstreamData.slice(0, 2000);
      else if (Buffer.isBuffer(upstreamData)) upstreamBodyPreview = upstreamData.toString("utf8", 0, 2000);
    } catch {
      // ignore preview errors
    }

    // Control-flow: Python returns 409 while another job is active (includes job_id).
    // Pass through so the frontend can poll `/processpdf/status/:jobId` instead of treating this as a 502.
    if (
      response.status === 409 &&
      upstreamData &&
      typeof upstreamData === "object" &&
      upstreamData.job_id
    ) {
      return res.status(409).json(upstreamData);
    }

    return res.status(502).json({
      error: "PDF processor failed",
      status: response.status,
      stage: "python_process_pdf",
      target: `${PYTHON_BASE_URL}/process_pdf${PYTHON_PROCESS_PDF_ASYNC ? "?async=1" : ""}`,
      upstream_content_type: upstreamContentType,
      upstream_body_preview: upstreamBodyPreview,
      details: upstreamData?.error || upstreamBodyPreview || upstreamData || "upstream_error",
      hint: `Check the Python service logs; if requests time out, enable async mode or increase resources. (PYTHON_BASE_URL=${PYTHON_BASE_URL || "unset"})`,
    });
  } catch (error) {
    const status = error?.response?.status;
    const details = error?.response?.data;
    const rawMessage = error?.message;
    const safeMessage = rawMessage && rawMessage !== "Error" ? rawMessage : "Internal Server Error";
    console.error("PROCESS PDF ERROR:", error);
    return res.status(500).json({
      error: safeMessage,
      stage: "internal",
      ...(process.env.NODE_ENV === "production" ? {} : { raw_message: rawMessage, stack: error?.stack }),
      ...(status ? { upstream_status: status } : {}),
      ...(details ? { upstream_error: details } : {}),
    });
  } finally {
    await rmrf(reqDir);
    if (typeof req._processPdfRelease === "function") req._processPdfRelease();
  }
};

// Back-compat aliases used by older frontends.
app.post("/processpdf", processPdfRateLimit, processPdfConcurrency, processPdfUpload, processPdfHandler);
app.post("/api/process-pdf", processPdfRateLimit, processPdfConcurrency, processPdfUpload, processPdfHandler);

const processPdfStatusHandler = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const target = `${PYTHON_BASE_URL}/process_pdf/status/${encodeURIComponent(jobId)}`;

    let lastErr = null;
    const attempts = Math.max(1, PYTHON_PROCESS_PDF_STATUS_RETRIES + 1);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await axios.get(target, {
          timeout: PYTHON_PROCESS_PDF_STATUS_TIMEOUT_MS,
          validateStatus: () => true,
        });
        return res.status(response.status).json(response.data);
      } catch (err) {
        lastErr = err;
        const code = err?.code;
        const isTimeout = code === "ETIMEDOUT" || code === "ECONNABORTED";
        if (attempt >= attempts || !isTimeout) throw err;
        const backoffMs = Math.min(2000, 250 * attempt);
        await sleep(backoffMs);
      }
    }

    // Should never get here, but just in case.
    throw lastErr || new Error("Unknown error fetching PDF status");
  } catch (err) {
    console.error("PYTHON /process_pdf/status ERROR:", err);
    const code = err?.code;
    const status = code === "ETIMEDOUT" || code === "ECONNABORTED" ? 504 : 503;
    return res.status(status).json({
      error: err?.message || "PDF status endpoint unreachable",
      stage: "python_process_pdf_status",
      code,
      timeout_ms: PYTHON_PROCESS_PDF_STATUS_TIMEOUT_MS,
      hint: `Set PYTHON_BASE_URL to your deployed Python service (currently: ${PYTHON_BASE_URL || "unset"})`,
    });
  }
};

app.get("/processpdf/status/:jobId", processPdfStatusHandler);
app.get("/api/process-pdf/status/:jobId", processPdfStatusHandler);

const askQuestionRateLimit = createRateLimiter({
  windowMs: parseInt(process.env.ASK_QUESTION_RATE_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.ASK_QUESTION_RATE_MAX || "120", 10),
});
const PYTHON_ASK_TIMEOUT_MS = parseInt(process.env.PYTHON_ASK_TIMEOUT_MS || "30000", 10);

const askQuestionHandler = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Missing question" });

    const response = await axios.post(
      `${PYTHON_BASE_URL}/ask_question`,
      { question },
      {
        headers: req.id ? { "x-request-id": req.id } : undefined,
        timeout: PYTHON_ASK_TIMEOUT_MS,
        maxContentLength: 2 * 1024 * 1024,
        maxBodyLength: 256 * 1024,
        validateStatus: () => true,
      },
    );

    if (response.status >= 200 && response.status < 300) {
      return res.json(response.data);
    }

    return res.status(502).json({
      error: "QA service failed",
      status: response.status,
      stage: "python_ask_question",
      details: response.data?.error || response.data || "upstream_error",
    });
  } catch (error) {
    const code = error?.code;
    const status = code === "ETIMEDOUT" || code === "ECONNABORTED" ? 504 : 503;
    return res.status(status).json({ error: error?.message || "QA service unreachable", stage: "python_ask_question", code });
  }
};

// Back-compat aliases used by older frontends.
app.post("/ask_question", askQuestionRateLimit, askQuestionHandler);
app.post("/api/ask-question", askQuestionRateLimit, askQuestionHandler);



// Ensure middleware errors (e.g. CORS) return JSON instead of an HTML 500 page.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err?.statusCode || err?.status || 500;
  const message =
    status === 403 && err?.message === "Not allowed by CORS"
      ? "Origin not allowed"
      : process.env.NODE_ENV === "production"
        ? "Server Error"
        : (err?.message || "Server Error");
  return res.status(status).json({ Message: message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on ${PORT}`);
});

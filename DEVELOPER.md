# Developer guide (Scholarly / BrainLink)

One document for the full-stack developer maintaining this app.

**Language note:** The frontend uses **`.jsx` files** — JavaScript with React. There is no TypeScript (no `.tsx`). If you know React and JavaScript, you can work here without learning TS.

---

## What this app is

A study Q&A platform: questions, comments, votes, notes (PDFs on Cloudinary), bookmarks, and **chat with an uploaded PDF**.

Three running parts:

| Part | Folder | Deploy (yours) | Job |
|------|--------|----------------|-----|
| Frontend | `frontend_refined/` | Vercel | UI, calls Node API |
| Node API | `backEnd/server.js` | Render service 1 | Auth, MongoDB CRUD, proxies PDF work to Python |
| Python API | `backEnd/app.py` | Render service 2 | PDF chunking, BM25 search, LLM answers |

MongoDB holds users, questions, notes, etc. Python also stores PDF bytes in **GridFS** and text **chunks** in MongoDB.

---

## Why PDF uses jobs + polling + `doc_id`

On Render free tier, long requests get killed mid-process. So:

1. Frontend uploads PDF → Node forwards to Python → Python returns a **`job_id`** immediately.
2. Python saves the PDF in GridFS and chunks text in the background (may restart if the process dies).
3. Frontend **polls** `GET /processpdf/status/:jobId` until `status` is `done`.
4. Response includes **`doc_id`**. Chat questions send `{ question, doc_id }` to `POST /ask_question`.

This is intentional, not leftover complexity.

---

## Local setup

### 1. MongoDB

Run Mongo locally or use Atlas. Set `MONGO_URI` in `backEnd/.env` (copy from `backEnd/.env.example`).

### 2. Node API (port 8081)

```bash
cd backEnd
npm install
npm start
```

Required env: `MONGO_URI`, `JWT_SECRET`, `PYTHON_BASE_URL` (your Python service URL, e.g. `http://localhost:8082` locally).

### 3. Python API (port 8082)

```bash
cd backEnd
pip install -r requirements.txt
python app.py
```

Uses the same `MONGO_URI` for PDF jobs/chunks.

### 4. Frontend (port 5173, proxies API to 8081)

From repo root:

```bash
npm run install:frontend
npm run dev:frontend
```

Optional frontend env (in `frontend_refined/.env` or root): `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET` for note/image uploads.

---

## Where to read code (in order)

1. **`frontend_refined/src/App.jsx`** — routes and layout shell.
2. **`frontend_refined/src/lib/auth.jsx`** — login state (cookie-based, no localStorage token).
3. **`frontend_refined/src/lib/api.js`** — every HTTP call goes through here.
4. **`frontend_refined/src/pages/QuestionsPage.jsx`** — typical page (React Query + API).
5. **`frontend_refined/src/pages/PdfChatPage.jsx`** — upload, poll job, ask questions.
6. **`backEnd/server.js`** — all Node routes (search for `app.get` / `app.post`).
7. **`backEnd/models/`** — Mongoose schemas.
8. **`backEnd/app.py`** — Python routes; you already know this part.

---

## Frontend structure

```
frontend_refined/src/
  App.jsx              # Router
  lib/
    api.js             # fetch wrapper
    auth.jsx           # AuthProvider
    cloudinaryUpload.js
    toast.jsx
  components/          # Sidebar, Topbar, MainLayout
  pages/               # One file per screen
```

Styling: **Tailwind CSS** in `index.css` + `tailwind.config.js`. Animations: **Framer Motion** inside pages.

React Query (`@tanstack/react-query`) loads and updates server data on most pages.

---

## Auth

- `POST /login` sets an **httpOnly cookie** named `token`.
- Frontend always sends cookies: `credentials: "include"` in `api.js`.
- Protected pages wrap in `<RequireAuth>` in `App.jsx`.
- `GET /userInfo` returns the logged-in user.

Production: frontend (Vercel) and API (Render) are different origins — CORS and `SameSite=None; Secure` cookies must be configured on the Node service.

---

## API endpoints (Node)

Auth: `POST /signup`, `POST /login`, `GET /logout`, `GET /userInfo`

Questions: `GET /allquestions`, `POST /question`, `POST /vote`, `GET /allcomments/:id`, `POST /comment`, `POST /commentvote`, bookmark routes

Notes: `GET /allnotes`, `POST /noteupload` (JSON with Cloudinary URL, not the file itself)

Tags: `GET /alltags`, `GET /question_tags`, `GET /questionswithtag`

PDF (proxied to Python): `POST /processpdf`, `GET /processpdf/status/:jobId`, `POST /ask_question`

Health: `GET /healthz`, `GET /readyz`

Some routes also exist under `/api/...` as aliases.

---

## Deploy checklist

**Render (Node):** `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS` (your Vercel URL), `PYTHON_BASE_URL` (Python Render URL)

**Render (Python):** `MONGO_URI`, HuggingFace token if using LLM, PDF/QA vars from `.env.example`

**Vercel:** build runs `npm run build`; set `VITE_API_BASE_URL` to Node Render URL **or** use `vercel.json` rewrites

---

## Common tasks

| Task | Where |
|------|--------|
| Change a page UI | `frontend_refined/src/pages/` |
| Add API route | `backEnd/server.js` + call from `api.js` |
| Change PDF behavior | `backEnd/app.py`, `pdf_utils.py` |
| DB shape | `backEnd/models/` |

---

## Do not hunt for

- **TypeScript / `.tsx`** — not used.
- **Legacy MySQL** — removed; data is MongoDB only.
- **Legacy UI** — only `frontend_refined` exists.
- **WebSockets** — PDF status uses HTTP polling only.

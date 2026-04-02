# BrainLink (Scholarly) – Frontend API Map (refined UI)

This is the API surface the refined UI expects.

Sources:
- Node API routes: `C:\Users\vohra\BrainLink\backEnd\server.js`
- Python service routes: `C:\Users\vohra\BrainLink\backEnd\app.py`
- Refined UI API client: `C:\Users\vohra\BrainLink\frontend_refined\src\lib\api.js`

---

## Base URL + cookies

- The refined UI uses `VITE_API_BASE_URL` (empty = same-origin).
- Auth uses an httpOnly cookie `token` set by `POST /login`; frontend requests must send cookies (`credentials: "include"`).
- On Vercel, `vercel.json` rewrites proxy same-origin API calls to the deployed backend.

---

## Core endpoints

### Health
- `GET /healthz`
- `GET /readyz`

### Auth
- `POST /signup`
- `POST /login` (sets cookie)
- `GET /auth` (cookie)
- `GET /userInfo` (cookie)
- `GET /logout` (clears cookie)

### Questions
- `GET /allquestions`
- `POST /question` (cookie)
- `POST /vote` (cookie)
- `GET /allcomments/:questionId`
- `POST /comment` (cookie)
- `POST /commentvote` (cookie)
- `POST /commentrating` (cookie)
- `POST /question_marked` / `POST /question_unmarked` / `POST /ismarked` (cookie)

### Tags
- `GET /alltags`
- `GET /question_tags`
- `GET /questionswithtag`

### Notes
- `GET /allnotes`
- `POST /noteupload` (cookie)
- `POST /notevote` / `POST /noteuservote` / `POST /noterating` (cookie)
- `POST /note_marked` / `POST /note_unmarked` / `POST /ismarkednote` (cookie)
- `GET /top-notes`

### PDF chat
- `POST /processpdf` (multipart/form-data: `pdfFiles`)
- `GET /processpdf/status/:jobId`
- `POST /ask_question` (json: `{ question }`)

Back-compat aliases (for older clients):
- `POST /api/process-pdf` → `/processpdf`
- `GET /api/process-pdf/status/:jobId` → `/processpdf/status/:jobId`
- `POST /api/ask-question` → `/ask_question`

### Contact
- `POST /api/contact` (stores message in MongoDB)

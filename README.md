# Scholarly

**Scholarly** is an interactive web application designed to make learning collaborative, simple, and engaging. It helps students, educators, and professionals connect by asking questions, providing answers, and sharing notes.

---

## **Key Features**

* **Ask & Answer Questions:** Post questions and get answers from the community. Comment on answers to clarify or discuss further.
* **Upload & Access Notes:** Share your notes or download helpful resources uploaded by others.
* **Tag-Based Organization:** All content is categorized with tags so users can easily find relevant material.
* **Chat with PDFs:** Ask questions directly about uploaded PDF documents and get instant responses.
* **Clean & Responsive UI:** User-friendly interface optimized for ease of use.
* **Secure Environment:** Sensitive information like API keys is never committed to the repository.

---

## Deployment Notes (Important)

This repo is a full-stack app:
- React frontend 
- Node/Express API 
- Python/Flask service 
- MongoDB database

## Frontend

- Dev server: `npm run refined:dev` (installs with `npm run refined:install`)
- Production build: `npm run build` (outputs to `build/`)
- Notes: see `FRONTEND_SWITCHING.md`

### PDF Chatbot (Production Runbook)

The PDF flow is split across services:

1. Client uploads PDF to the **Node API**: `POST /processpdf`
2. Node stores the upload on disk (not RAM) and calls the **Python service**: `POST /process_pdf`
3. Python chunks + embeds and persists a FAISS index on disk
4. Client asks questions via Node: `POST /ask_question` → Python: `POST /ask_question`

**Critical env vars**

- **Node service**
  - `PYTHON_BASE_URL=https://<your-python-service-domain>`
  - `PUBLIC_BASE_URL=https://<your-node-service-domain>` (required for `source_url` ingestion)
  - `PROCESSPDF_SOURCE_URL_ENABLE=1` (sends small JSON `{source_url}` to Python instead of multipart)
  - `PYTHON_PROCESS_PDF_ASYNC=1` (avoids reverse-proxy timeouts)

- **Python service**
  - `PROCESS_PDF_ASYNC=1`
  - `PROCESS_PDF_USE_SUBPROCESS=1` (runs heavy PDF/indexing work in a subprocess so RSS is released after jobs)
  - `WEB_CONCURRENCY=1` (prevents multiple workers duplicating model memory)
  - Optional low-memory mode: `QA_MODE=retrieval_only` (skips loading the local LLM and returns retrieved context)

**Debugging 502 / “stream has been aborted”**

- Check health:
  - Node: `GET /healthz` and `GET /readyz`
  - Python: `GET /healthz`
- If Node→Python calls fail, confirm:
  - Node `PYTHON_BASE_URL` points to the Python domain (not localhost)
  - Node `PUBLIC_BASE_URL` is set to Node’s public domain (so Python can download `GET /processpdf/source/:token`)
  - Python `WEB_CONCURRENCY=1` (multiple workers can OOM on small instances)

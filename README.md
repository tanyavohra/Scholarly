# BrainLink (Deployment Notes)

This repo contains:
- `src/`, `public/`: React (Create React App) frontend
- `backEnd/server.js`: Node/Express API (MySQL + PDF utilities + proxy to Python)
- `backEnd/app.py`: Python/Flask service for PDF processing + Q&A (FAISS/LangChain)

## Quick Start (Docker Compose)

Prereqs: Docker Desktop

1. Copy environment examples:
   - `copy .env.example .env` (Compose + frontend build-time config)
2. Start everything:
   - `docker compose up --build`
3. Open:
   - Frontend: `http://localhost:3000`
   - Node API: `http://localhost:8081/healthz`
   - Python API: `http://localhost:8082/healthz`

## Local Dev (No Docker)

1. Backend (Node):
   - `cd backEnd`
   - `npm install`
   - `npm run dev`
2. Python service:
   - `cd backEnd`
   - `python -m venv .venv && .venv\\Scripts\\activate`
   - `pip install -r requirements.txt`
   - `python app.py`
3. Frontend:
   - `npm install`
   - `npm start`

## Deployment Improvements Applied

- All ports, DB credentials, CORS origins, secrets are now environment-driven (no hard-coded `localhost`/`secret-key` in runtime config).
- Added `/healthz` endpoints for Node + Python.
- Added Dockerfiles + `docker-compose.yml` for a reproducible production-ish deployment shape.

## Environment Variables

Frontend:
- `REACT_APP_API_BASE_URL` (example: `https://api.example.com`)

Node API (`backEnd/server.js`):
- `PORT` (default `8081`)
- `JWT_SECRET` (required in production)
- `CORS_ORIGINS` (comma-separated, example: `http://localhost:3000,https://app.example.com`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PYTHON_BASE_URL` (example: `http://python-api:8082`)

Python API (`backEnd/app.py`):
- `PORT` (default `8082`)
- `CORS_ORIGINS` (comma-separated)
- `FAISS_DIR` (default `faiss_index`)
- Provider keys (as needed by your LangChain stack): `GOOGLE_API_KEY`, etc.

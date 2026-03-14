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
- React frontend (`src/`, `public/`)
- Node/Express API (`backEnd/server.js`)
- Python/Flask service (`backEnd/app.py`)
- MySQL database

GitHub Pages can host only the **frontend** (static files). It cannot run Node/Python/MySQL.

### Free Option: GitHub Pages (Frontend Only)

1. Push this repo to GitHub (branch `main`).
2. In GitHub: `Settings` → `Pages` → set Source to `GitHub Actions`.
3. In GitHub: `Settings` → `Secrets and variables` → `Actions` → `Variables`:
   - Add `REACT_APP_API_BASE_URL` with your backend API base URL (example: `https://your-api.example.com`).
4. Push to `main`. The workflow `Deploy to GitHub Pages` builds and publishes the site.

Routing: this app uses `HashRouter`, so routes work on GitHub Pages without server rewrites (URLs look like `/#/Home`).

### Full App Hosting (Backend Required)

To make login and the rest of the app work for other users, you must also host:
- Node API somewhere public
- Python service somewhere (public or private behind Node)
- MySQL somewhere with persistence



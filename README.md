# Scholarly

Collaborative study platform: ask questions, share notes, chat with PDFs.

**For the developer maintaining this repo, start with [DEVELOPER.md](DEVELOPER.md).**

## Features

- Ask and answer questions with tags, comments, votes, and bookmarks
- Upload notes (PDFs stored on Cloudinary)
- Chat with an uploaded PDF (AI Q&A)
- Contact form

## Tech stack

- Frontend: React (JavaScript `.jsx` files), Vite, Tailwind CSS, Framer Motion
- Backend: Node.js, Express, MongoDB
- PDF service: Python (Flask), GridFS, BM25 + HuggingFace

## Quick start

See [DEVELOPER.md](DEVELOPER.md) for local setup (MongoDB, Node on 8081, Python on 8082, frontend on 5173).

```bash
npm run install:frontend
npm run dev:frontend
```

## Deploy

- Frontend: Vercel (`npm run build`)
- APIs: two Render services (Node + Python) — see DEVELOPER.md checklist

## Contributing

Open an issue or PR if you have suggestions.

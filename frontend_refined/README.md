# BrainLink refined UI

This is the refined BrainLink/Scholarly frontend (Vite + React).

## Dev (local)

1. Start the Node API on `http://localhost:8081` (and the Python service it depends on).
2. From the repo root:

```bash
npm run refined:install
npm run refined:dev
```

The Vite dev server runs on `http://localhost:8080` and proxies API calls to `http://localhost:8081`.

## Deploy

This repo supports deploying either UI (legacy or refined) via a build-time switch.
See `C:\Users\vohra\BrainLink\FRONTEND_SWITCHING.md`.

## Env vars (optional)

These are only needed if you want to override defaults:

- `VITE_API_BASE_URL` (defaults to same-origin; use only if you’re not using Vercel rewrites / Vite proxy)
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET`

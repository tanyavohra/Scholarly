# Frontend (refined only)

This repo uses the **refined UI** only:

- `C:\Users\vohra\BrainLink\frontend_refined`

`npm run build` builds the refined UI and copies it into the repo-root `build/` folder (used by `vercel.json` and `Dockerfile.web`).

## Run refined UI (dev)

First-time install:

```bash
npm run refined:install
```

Run dev server:

```bash
npm run refined:dev
```

Local dev notes:
- Refined UI runs on the Vite default port (typically `http://localhost:5173`).
- API base URL is controlled by `VITE_API_BASE_URL` (empty = same-origin).

## Deploy (Vercel)

Vercel builds from the repo root and serves the static `build/` output.

## Deploy (Dockerfile.web)

```bash
docker build -f Dockerfile.web -t brainlink-web .
```

## Rollback

- Use git to revert to a previous commit/tag if you need to roll back.

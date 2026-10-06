# Minimal Paste

24-hour pastebin: paste text, get a shareable URL, everything auto-deletes after 24 hours.
No accounts, no file uploads, no build step. Single-file frontend, zero-config Vercel deployment.

## Features

- Text-only pastes, up to **5 MiB** (byte-based UTF-8 check on both client and server)
- Unpredictable IDs (`crypto.randomBytes`, URL-safe base64)
- Auto-expiration after **24 hours** (lazy check on every read + scheduled cleanup)
- XSS-safe: paste content is rendered with `textContent` only and served with strict CSP / `nosniff`
- `/raw/:id` returns `text/plain; charset=utf-8`
- Rate limit: 5 creations per IP per 10 minutes (429 after)
- `GET /api/health` health check

## Routes

| Route          | Description                 |
| -------------- | --------------------------- |
| `/`            | Create paste UI             |
| `/p/:id`       | Paste viewer                |
| `/raw/:id`     | Raw paste content           |
| `/api/paste`   | `POST` create paste         |
| `/api/health`  | Health check                |
| `/api/cleanup` | Cleanup expired pastes      |

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

Without a token the dev server runs in **in-memory LOCAL MODE** so the full flow is testable offline.

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (zero-config: `api/` functions + `public/` statics + `vercel.json`).
2. **Create & connect a Blob store** (this is the step most people miss):
   - Vercel Dashboard → **Storage** → **Create** → **Blob**
   - Connect the store to your project, selecting the **Production** (and Preview) environments
   - This auto-injects the `BLOB_READ_WRITE_TOKEN` environment variable
3. Set `CRON_SECRET` in Project → Settings → Environment Variables (any random string).
   Vercel Cron (`vercel.json`, every 30 min) sends it as `Authorization: Bearer` to `/api/cleanup`.
4. **Redeploy.** Env vars added after the last deploy only take effect after a new deployment.

### Verify your Blob token

```bash
# put your token in .env.local, then:
npm run test:blob
```

It does a real `put → list → get → delete` round-trip and tells you exactly what's wrong.

## Troubleshooting

### `Vercel Blob: No token found. Either configure the BLOB_READ_WRITE_TOKEN environment variable...`

The env var is **not present in the running environment**. Causes:

- The Blob store was never connected to the Vercel project (Dashboard → Storage → Connect Store), or
- It was connected to the wrong environment (check Production vs Preview), or
- You connected it after the last deploy → **redeploy** to pick it up, or
- Locally: the token is missing from `.env.local` (restart the dev server after adding it).

### Token looks wrong (`vcp_...` instead of `vercel_blob_rw_...`)

- `vcp_...` = **Vercel account access token** (for the Vercel API/CLI). It does NOT work with Blob.
- `vercel_blob_rw_...` = **Blob store read/write token**. Get it from Dashboard → Storage → your store → *Connect Store* (or the `.env` tab).
- If your code reads `BLOB_READ_WRITE_TOKEN` but Vercel created a prefixed variable like `MYSTORE_READ_WRITE_TOKEN`, this app accepts any `*_READ_WRITE_TOKEN` automatically.

### 413 on very large pastes on Vercel

Vercel's Node function request body limit is 4.5 MB on Hobby / 5 MB on Pro. The app enforces 5 MiB; on Hobby, pastes between 4.5–5 MB will be rejected by the platform before reaching the code.

## Cleanup architecture

Two layers (per spec):

1. **Lazy expiration** — every read checks `expiresAt` and returns 404 for expired pastes.
2. **Scheduled cleanup** — Vercel Cron calls `/api/cleanup` every 30 minutes (protected by `CRON_SECRET`).
   Optional second safety net: copy `docs/github-workflows/cleanup.yml` to `.github/workflows/`
   (kept out of `.github/` here due to repo permission limits; set `SITE_URL` and `CRON_SECRET` repo secrets to enable).
   Same applies to `docs/github-workflows/health.yml` (periodic `/api/health` check).

## Secrets

- Never commit `.env*` files (already gitignored).
- Required env vars: `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`.
- GitHub Actions secrets (optional): `SITE_URL`, `CRON_SECRET`.

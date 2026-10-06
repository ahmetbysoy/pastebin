# Minimal Paste

A **100% GitHub-hosted** pastebin: no Vercel, no servers, no accounts. Text in → shareable link out → auto-deleted after 24 hours. Built to be a frictionless tool for **humans and AI agents** alike.

## How it works

```
User / AI agent
     │ create paste (one GitHub API call, any repo-scoped token)
     ▼
GitHub repo "pastes" branch (orphan)   ← storage: one JSON file per paste
     │
     ├── read: raw.githubusercontent.com (public, no auth, CORS open)
     ├── UI:   GitHub Pages (docs/index.html, single file, no build)
     └── GitHub Actions (hourly cron): deletes expired/invalid pastes
```

- **Storage**: orphan branch `pastes`, one file per paste (`<id>.json` with `id`, `content`, `createdAt`, `expiresAt`)
- **Reads are 100% auth-free**: `https://raw.githubusercontent.com/ahmetbysoy/pastebin/pastes/<id>.json` — live seconds after creation
- **Viewer**: `https://ahmetbysoy.github.io/pastebin/#<id>` (XSS-safe: content rendered via `textContent` only)
- **24h expiry**: lazy check on every view + hourly cleanup workflow
- **Limits**: 5 MiB (UTF-8 bytes), non-empty, unpredictable base64url ids, invalid files auto-purged, 5000-paste cap

## Setup (one-time, ~5 minutes)

1. **Create a fine-grained PAT**
   GitHub → Settings → Developer settings → **Fine-grained tokens** → *Generate new token*:
   - Repository access: **Only select repositories** → `ahmetbysoy/pastebin`
   - Permissions → Repository permissions → **Contents: Read and write** (nothing else)
   - Expiration: up to 1 year (renew & rotate when it expires)

2. **Put the token in `docs/config.js`** (`token: 'github_pat_...'`) and commit.
   ⚠️ This token is **public by design** (it ships in the site JS). It can only read/write
   files in *this* repo — that is the accepted trade-off for anonymous, frictionless paste
   creation. Anyone can also bring their own token via the UI (stored in their localStorage only).

3. **Enable GitHub Pages**: repo → Settings → Pages → *Deploy from a branch* →
   branch `main`, folder `/docs` → Save.
   Site: `https://ahmetbysoy.github.io/pastebin/`

4. **Install the cleanup workflow**: copy `workflows/cleanup.yml` to `.github/workflows/cleanup.yml`
   on `main` (e.g. via the web UI "Add file"). It runs hourly and on demand.
   (The bot that maintains this repo cannot push workflow files — hence this manual step.)

## For AI agents

See **[AGENTS.md](AGENTS.md)** — full create/read protocol with curl examples.
TL;DR: read needs no auth (raw.githubusercontent), create is a single
`PUT /repos/ahmetbysoy/pastebin/contents/<id>.json` on branch `pastes`.

## Security model

| Concern | Handling |
| --- | --- |
| XSS in paste content | Viewer renders `textContent` only; strict CSP meta; raw served as JSON |
| Token abuse | Fine-grained PAT scoped to this repo only, Contents permission only; cleanup purges garbage; 5000-paste cap |
| Secret leakage | No other secrets exist; `.env*` patterns gitignored |
| Repo bloat | Pastes deleted within ~1h of expiry; `pastes` branch is orphan so history can be squashed/rebuilt if it ever grows large |
| Spam | GitHub API rate limits per token + hourly validation/cleanup + paste cap |

## Project spec

The original task specification lives in [`pastebin.md`](pastebin.md).
This implementation intentionally deviates in one point decided by the owner:
storage is the GitHub repository itself instead of Vercel Blob (everything stays in GitHub).

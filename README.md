# AlphaGuard Dashboard

Internal anti-cheat portal for SF Alpha. Admins sign in with their SF Alpha account and view:

- **Detections** — paginated list from `/v2/auth/ac-detections` (External AC API).
- **Screenshots** — pulled directly from the MariaDB `data` table (mediumblob images).

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- `iron-session` for encrypted cookie sessions
- `mysql2` for MariaDB access

## Setup

1. Copy the env template and fill in values:
   ```bash
   cp .env.example .env.local
   ```
   Required:
   - `GAME_API_BASE` — e.g. `https://api.sf-alpha.com/v2`
   - `AC_USERNAME` / `AC_PASSWORD` — the External-AC-role account used to fetch detections
   - `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` — MariaDB for screenshots
   - `DB_SCREENSHOT_TABLE` — defaults to `data`
   - `SESSION_SECRET` — 32+ byte hex string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `ALLOWED_ROLES` — comma-separated `role_name` values allowed into the dashboard. Default `admin`.

2. Install and run:
   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000 and sign in with an SF Alpha admin account.

## Auth model

- `/api/login` calls `POST /v2/auth/login` on the game API with the user's credentials.
- If `role_name` is in `ALLOWED_ROLES`, the bearer `token` is stored in an encrypted `alphaguard_session` cookie (httpOnly, 8 h).
- The dashboard layout guards all `/dashboard/*` routes with the session + role check.

The External AC service token (used for the detections list) is separate: the server logs in once with `AC_USERNAME` / `AC_PASSWORD`, caches the token in memory, and refreshes on 401.

## Layout

```
src/
  app/
    login/                 ← login page + form
    dashboard/
      detections/          ← Detections tab
      screenshots/         ← Screenshots tab
    api/
      login/, logout/
      detections/          ← proxies /v2/auth/ac-detections
      screenshots/         ← list + /[id] (streams the blob)
  lib/
    session.ts             ← iron-session config + admin check
    game-api.ts            ← POST /v2/auth/login
    ac-token.ts            ← cached External AC bearer + acFetch
    db.ts                  ← MariaDB pool
```

## Adding more API-backed pages

Each new feature is two files: an API route under `src/app/api/<feature>/route.ts` that uses `acFetch()` (or hits another backend), and a page under `src/app/dashboard/<feature>/`. The sidebar in `src/app/dashboard/Nav.tsx` has the link list — add your page there.

## Security notes

- `.env.local` is gitignored. Never commit real credentials.
- `SESSION_SECRET` rotates all sessions when changed.
- The screenshot image endpoint caches only with `private, max-age=60` so images aren't kept by shared caches.

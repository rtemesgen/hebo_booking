# Hebo Monorepo

Hebo is an offline-first bookkeeping app for Android/web with:
- Multi-tenant structure (`tenant -> businesses -> books -> records`)
- Local-first writes with sync queue
- Backend auth + tenant isolation
- Export/reporting, audit logs, and conflict visibility

## Project Structure

- `frontend/` Vue 3 + Vite + Pinia + Tailwind + Playwright
- `backend/` Express + PostgreSQL (auth, tenant APIs, sync APIs)
- `.github/workflows/ci.yml` CI checks for test/build/e2e
- `android-artifacts/` generated APK artifacts
- `app-snapshots/` backup snapshots

## Quick Start

### 1. Backend

1. `cd backend`
2. Copy env: `cp .env.example .env` (or create manually on Windows)
3. Update `DATABASE_URL` and `JWT_SECRET`
4. Install deps: `npm install`
5. Init DB schema: `npm run db:init`
6. Start API: `npm run dev`

### 2. Frontend

1. `cd frontend`
2. Copy env: `cp .env.example .env`
3. Set `VITE_API_BASE_URL=http://localhost:4000`
4. Install deps: `npm install`
5. Run app: `npm run dev`

## Validation Commands

From `backend/`:
- `npm test`

From `frontend/`:
- `npm run test`
- `npm run build`
- `npm run test:e2e` (set `E2E_BACKEND_URL` for backend-coupled e2e cases)

## Offline + Sync Behavior

- If backend/auth is unavailable, writes are stored locally and queued.
- Queue items are not marked synced until server confirms them.
- Snapshot pull is blocked when local pending/failed changes exist to avoid overwriting newer offline data.

## Android Build Note

If your project path contains an apostrophe (for example `Thomas's Projects`), Android/Gradle path generation can fail.  
Recommended workaround: build from a path without apostrophes (example `C:\Users\HAVEN\Desktop\HeboBuild\frontend`), then copy APK back into `android-artifacts/`.

## Git Push Checklist

1. Ensure `.env` files are not staged.
2. Run all validation commands above.
3. Confirm backend points to the correct production database before deploy.
4. Commit and push.

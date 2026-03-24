# Hebo Frontend

Vue 3 mobile-first frontend for offline bookkeeping, tenant/business/book management, and sync-aware workflows.

## Setup

1. Copy env file:
   - `.env.example` -> `.env`
2. Configure:
   - `VITE_API_BASE_URL=http://localhost:4000`
3. Install:
   - `npm install`
4. Run:
   - `npm run dev`

## Commands

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

For backend-dependent e2e tests:
- `E2E_BACKEND_URL=http://127.0.0.1:4000 npm run test:e2e`

## Notes

- App is offline-first: local writes continue without network.
- Sync queue status is visible in Settings.
- Frontend uses server-first CRUD when online + authenticated, with local fallback on failure.

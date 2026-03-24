# Hebo Backend

Express + PostgreSQL backend for real production sync, auth, and tenant isolation.

## 1) Setup

1. Copy `.env.example` to `.env` (already added with local defaults).
2. Create PostgreSQL database `hebo`.
3. Install dependencies:
   - `npm install`
4. Initialize schema:
   - `npm run db:init`
5. Start server:
   - `npm run dev`

## 2) API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/tenant/me`
- `GET /api/tenant/businesses`
- `POST /api/tenant/businesses`
- `POST /api/sync/batch`

All `/api/tenant/*` and `/api/sync/*` routes require `Authorization: Bearer <token>`.

## 3) Tenant isolation

Data is scoped by `tenant_id`, and authenticated JWT contains:
- `userId`
- `tenantId`
- `role`

Sync operations validate business ownership against the authenticated tenant.

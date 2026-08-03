# HatchLog Backend

Standalone NestJS API for HatchLog (Option A). Separate from the Next.js web app and Flutter clients.

## Stack

- NestJS 11
- Prisma 6 + Supabase Postgres
- Supabase JWT auth (Bearer)
- BullMQ + Redis workers
- OpenAPI at `/docs`

## Quick start

```bash
cp .env.example .env
# fill DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_JWT_SECRET

npm install
npx prisma generate
npm run start:dev
```

API: http://localhost:3001  
Docs: http://localhost:3001/docs  
Health: http://localhost:3001/health

Worker (separate terminal, Redis required):

```bash
npm run start:worker
```

Docker Compose (API + worker + Redis):

```bash
docker compose up --build
```

## Sync API (v1)

`POST /api/v1/sync/push` — batched mutations with idempotent `client_id`  
`GET /api/v1/sync/pull?farm_id=&since=&limit=` — cursor delta  
`GET /api/v1/sync/status?farm_id=` — status snapshot

Phase 1 handlers: `egg_collection`, `feed_usage`, `mortality`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | API with watch |
| `npm run start:worker` | BullMQ worker |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled API |
| `npx prisma generate` | Generate Prisma client |

## Notes

- Prisma schema is copied from `poultry-pms` and shares the same Supabase database.
- Clients must send a valid Supabase access token as `Authorization: Bearer <token>`.
- Do not put the Supabase service-role key in client apps.

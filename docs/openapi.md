# OpenAPI / Swagger

Interactive docs are served by the running API:

- Local: http://localhost:3001/docs
- Spec is generated from NestJS decorators via `@nestjs/swagger`

Phase 1 endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | public | Liveness + DB check |
| POST | `/api/v1/sync/push` | Bearer JWT | Batch offline mutations |
| GET | `/api/v1/sync/pull` | Bearer JWT | Delta pull since cursor |
| GET | `/api/v1/sync/status` | Bearer JWT | Farm sync status |

Supported push `entity_type` values in Phase 1:

- `egg_collection`
- `feed_usage`
- `mortality`

Other entity types return `rejected` with `UNSUPPORTED_ENTITY`.

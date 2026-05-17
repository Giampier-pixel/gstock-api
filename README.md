# gstock-api

REST API for **gstock**, the inventory-management web app. Built with **NestJS 11 + Prisma 6 + PostgreSQL**. Deployed to **Render** with the database on **Supabase**.

Frontend: [Giampier-pixel/gstock](https://github.com/Giampier-pixel/gstock) (Next.js 16).

## Stack

- NestJS 11 (modular: `auth`, `users`, `products`, `movements`, `providers`, `dashboard`, `reports`, `health`)
- Prisma 6 + PostgreSQL 16
- Passport JWT (single bearer, 7d TTL)
- `class-validator` / `class-transformer` DTOs
- `@nestjs/swagger` → `/docs` (basic-auth in production)
- `nestjs-pino` structured logs
- `@nestjs/throttler` (120 req/min per IP)
- RFC 7807 `application/problem+json` errors
- URI versioning under `/v1` (`/health` is version-neutral)

## Quickstart

```bash
npm install
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET, ADMIN_SEED_*
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run start:dev          # http://localhost:3001  /  http://localhost:3001/docs
```

### Local Postgres via Docker Compose

```bash
docker compose up -d postgres   # only the DB
# or
docker compose up               # API + DB
```

## Environment variables

See `.env.example`. Required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase pooled connection (`:6543?pgbouncer=true&connection_limit=1`) — runtime |
| `DIRECT_DATABASE_URL` | Supabase direct connection (`:5432`) — used by `prisma migrate` |
| `JWT_SECRET` | 32-byte base64 |
| `JWT_TTL` | e.g. `7d` |
| `ADMIN_SEED_USER` / `ADMIN_SEED_PASSWORD_HASH` / `ADMIN_SEED_NAME` / `ADMIN_SEED_EMAIL` | seeded into the DB on first migration |
| `CORS_ORIGIN` | comma-separated list of allowed origins |
| `SWAGGER_USER` / `SWAGGER_PASSWORD` | basic-auth gate for `/docs` (only enforced when `NODE_ENV=production`) |
| `PORT` | default 3001 (Render uses 10000) |
| `LOG_LEVEL` | default `info` |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # JWT_SECRET
node -e "console.log(require('bcryptjs').hashSync('your-pw', 10))"           # ADMIN_SEED_PASSWORD_HASH
```

## Scripts

| Script | Action |
|---|---|
| `npm run start:dev` | Nest in watch mode |
| `npm run build` | `nest build` |
| `npm run start:prod` | `node dist/main.js` |
| `npm test` | Jest unit tests |
| `npm run test:e2e` | Jest e2e suite (requires DB) |
| `npm run lint` | ESLint with autofix |
| `npm run prisma:migrate:dev` | run dev migration |
| `npm run prisma:migrate:deploy` | apply migrations (CI / prod) |
| `npm run db:seed` | run `prisma/seed.ts` |

## Endpoints (v1)

All endpoints below are namespaced under `/v1` and require `Authorization: Bearer <token>` unless marked `[public]`.

- `POST /v1/auth/login` `[public]` → `{ accessToken, user }`
- `GET  /v1/auth/me`
- `GET  /v1/products` `?page&pageSize&q&category&status`
- `GET  /v1/products/:id`
- `POST /v1/products`
- `PATCH /v1/products/:id`
- `DELETE /v1/products/:id` → 204
- `GET  /v1/movements` `?page&pageSize&productId&type&from&to`
- `POST /v1/movements` → atomic stock adjustment
- `DELETE /v1/movements/:id` → reverts stock atomically
- `GET  /v1/providers` `?page&pageSize&q`
- `GET  /v1/providers/:id`
- `POST /v1/providers`
- `PATCH /v1/providers/:id`
- `DELETE /v1/providers/:id` → 204
- `GET  /v1/dashboard/kpis`
- `GET  /v1/reports/revenue?days=14`
- `GET  /v1/reports/categories`
- `GET  /health` `[public, version-neutral]`

Full schema lives in Swagger at `/docs` (`/docs-json` for the raw OpenAPI).

## Error format (RFC 7807)

All errors are returned as `application/problem+json`:

```json
{
  "type": "https://gstock.vercel.app/errors/conflict",
  "title": "Conflict",
  "status": 409,
  "detail": "Unique constraint violated.",
  "instance": "/v1/products"
}
```

## Deployment (Render)

`render.yaml` is committed at the repo root. Render auto-deploys `main` to production. Database lives on Supabase (separate project per environment recommended).

### Manual setup checklist

1. Create a Supabase project (`gstock-prod`). Copy both connection strings.
2. In Render → New → Blueprint → connect this repo. Render reads `render.yaml`.
3. Fill in the env vars marked `sync: false` (Supabase URLs, secrets, CORS).
4. Trigger a deploy. The startup command runs `prisma migrate deploy` before booting the server.
5. Hit `/health` to confirm readiness.

## CI

`.github/workflows/ci.yml` runs on every push and PR to `main`/`dev`:

- Spins up Postgres 16 as a service container
- `npm ci` → `prisma generate` → `prisma migrate deploy` → `npm run build` → `npm test`

## License

UNLICENSED — private project.

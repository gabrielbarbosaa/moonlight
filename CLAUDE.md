# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SiteBuilder (repo folder `moonlight`): a multi-tenant platform for building personal pages from blocks (header, hero, links, text, footer), with an admin panel and analytics. Study/portfolio project meant to run 100% locally at no cost. README and code comments are in Portuguese. The project is early-stage: the API only has a health endpoint and Prisma wiring, and there are no tests yet (each package's `test` script is a placeholder `echo`).

## Conventions

- Do not write comments in code (no line, block, or JSDoc comments). Existing comments in the repo may stay.
- Chat with the user in pt-br.

## Commands

pnpm 9 workspaces + Turborepo, Node >= 20 (`.nvmrc`). Run from the repo root:

```bash
pnpm install
cp .env.example .env
pnpm infra:up                          # Postgres 17, Redis, Mailpit (:8026), MinIO (:9001) via docker compose
pnpm --filter @sitebuilder/schemas build   # required once before api/web (they consume its dist/)
pnpm db:migrate                        # prisma migrate dev (api)
pnpm dev                               # web :3000, api :4000
pnpm verify                            # lint + typecheck + test + build (Turbo-cached)
pnpm lint | typecheck | test | build   # single task across all packages
pnpm --filter api typecheck            # single task in a single package
pnpm format                            # prettier --write .
```

- `lint` in every package is just `tsc --noEmit` (no ESLint). In `apps/web` both `lint` and `typecheck` use `tsconfig.typecheck.json`, which avoids `.next/` so they cannot race with `next build`.
- Turbo tasks `build`, `lint`, `typecheck`, and `test` all depend on `^build`, so `@sitebuilder/schemas` is built first automatically when running through Turbo; when running a package script directly, build schemas yourself.
- api `build`/`dev`/`typecheck` run `prisma generate` first.

## Git hooks (Husky)

- pre-commit: `lint-staged` (prettier on staged files).
- commit-msg: commitlint, Conventional Commits required (`feat:`, `fix:`, `docs:`...).
- pre-push: `pnpm typecheck && pnpm test`.
- No cloud CI; verification is local.

## Architecture

- `apps/web`: Next.js 15 (App Router, React 19). Routes: landing, `/admin`, and `/s/[tenant]` for public tenant pages.
- `apps/api`: NestJS 10 + Prisma 6 (PostgreSQL). Entry `src/main.ts`, `PrismaModule`/`PrismaService`, `health` controller.
- `packages/schemas` (`@sitebuilder/schemas`): shared Zod schemas (auth, tenant, blocks, `RESERVED_SLUGS`), compiled to `dist/` and imported by both apps. Pages are stored as JSONB with a `schemaVersion` and validated by the same Zod schema on front and back, so change block shapes here, not in the apps.

- `packages/renderer` (`@sitebuilder/renderer`): React `PageRenderer` that turns a `PageContent` into the public page. It re-validates with `pageSchema` and passes every URL through `safeHref`. The editor preview should reuse it. Rebuild it (and schemas) after changes, since apps consume `dist/`.

### Analytics

Public tenant pages mount `TrackView` (`apps/web/src/components/track-view.tsx`), which POSTs views and clicks to `/analytics/track` (links carry `data-track-link` from the renderer). The API counts them in Redis (`an:d:*` hashes, `an:u:*` HyperLogLog of daily-salted visitor hashes). `AnalyticsRollupService` consolidates past UTC days into the `analytics_daily` table on boot and via cron at 00:05 UTC. `/analytics/me` merges Postgres rows with live Redis data. CORS in `main.ts` allows `*.ROOT_DOMAIN` origins only for `/analytics/track`, the public report endpoint and `/booking/public/*`, without credentials.

### Backoffice and moderation

Users whose email is listed in `SUPERADMIN_EMAILS` (comma-separated env var) are promoted to `SUPERADMIN` when they confirm a 2FA code. `/backoffice/*` routes use `SessionGuard` then `SuperadminGuard` (checks role in the DB). Moderation = suspending a tenant (`status`, `suspendedReason`; the public endpoint 404s for non-active tenants) plus visitor reports (`TenantReport`, public `POST /tenants/public/:slug/report`, rate-limited). Every admin action writes an `AuditLog` row. UI is at `/admin/backoffice`; the owner sees a suspension notice on `/admin`.

### Booking (optional module)

Per tenant: `bookingEnabled`, `timezone`, `BookingService` (name + duration), `AvailabilityRule` (weekday + minute window in the tenant timezone) and `Booking`. The double-booking guard lives in the database: the `booking` migration adds `btree_gist` and the `bookings_no_overlap` exclusion constraint (`tstzrange("startsAt","endsAt")` per tenant, only for `CONFIRMED`), plus check constraints; Prisma does not model them, so keep them when editing migrations. `BookingService` (API) computes free slots from rules minus confirmed bookings (min notice 2h, max 60 days ahead) using Intl-based helpers in `booking.time.ts`, and maps constraint violations (`23P01`) to 409. Public UI is `/s/[tenant]/agenda`; owner UI is `/admin/agenda`. Emails go through `MailPort`.

### API validation and docs

Request bodies are validated by a global `ZodValidationPipe` from `nestjs-zod`. DTOs are built with `createZodDto(schema)` from the shared schemas (see `apps/api/src/auth/auth.dto.ts`), which also feeds Swagger. Swagger UI is served at `/docs` outside production.

### Tenant resolution (spans several files)

`apps/web/src/middleware.ts` calls `getTenantSlugFromHost` (`src/lib/tenant-host.ts`) against `ROOT_DOMAIN` (env, default `localhost:3000`). A single-level subdomain that is not in `RESERVED_SLUGS` (`maria.localhost:3000`) is internally rewritten to `/s/maria/...`. The root domain is untouched, so landing and `/admin` work. `/s/[tenant]` is also directly reachable as a path fallback for hosts without wildcard subdomains.

### Design decisions (from README)

- Session cookie is host-only on the main domain so tenant pages never receive the admin session.
- Prisma is the ORM, with raw SQL in migrations for features it can't model (e.g. `tstzrange` exclusion constraints for the future scheduling module).
- Email, storage, and billing sit behind interfaces so adapters can be swapped without touching the domain.
- Dev services: Mailpit catches 2FA emails; MinIO is the S3-compatible store. Config in `.env.example`.

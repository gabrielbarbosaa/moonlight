# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Moonlight (repo folder `moonlight`): a multi-tenant platform for building personal pages from blocks (header, hero, links, text, footer), with an admin panel and analytics. Study/portfolio project meant to run 100% locally at no cost. README and code comments are in Portuguese. The README roadmap is implemented end to end (auth with 2FA, tenants, blocks and renderer, editor, analytics, backoffice, booking, plans and billing sandbox). There are no automated tests yet (each package's `test` script is a placeholder `echo`); verification so far is `pnpm verify` plus manual end-to-end runs.

## Conventions

- Do not write comments in code (no line, block, or JSDoc comments). Existing comments in the repo may stay.
- Chat with the user in pt-br.

## Commands

pnpm 9 workspaces + Turborepo, Node >= 20 (`.nvmrc`). Run from the repo root:

```bash
pnpm install
cp .env.example .env
pnpm infra:up                          # Postgres 17, Redis, Mailpit (:8026) via docker compose
pnpm --filter @moonlight/schemas build   # required once before api/web (they consume its dist/)
pnpm db:migrate                        # prisma migrate dev (api)
pnpm dev                               # web :3000, api :4000
pnpm verify                            # lint + typecheck + test + build (Turbo-cached)
pnpm lint | typecheck | test | build   # single task across all packages
pnpm --filter api typecheck            # single task in a single package
pnpm format                            # prettier --write .
```

- `lint` in every package is just `tsc --noEmit` (no ESLint). In `apps/web` both `lint` and `typecheck` use `tsconfig.typecheck.json`, which avoids `.next/` so they cannot race with `next build`.
- Turbo tasks `build`, `lint`, `typecheck`, and `test` all depend on `^build`, so `@moonlight/schemas` is built first automatically when running through Turbo; when running a package script directly, build schemas yourself.
- api `build`/`dev`/`typecheck` run `prisma generate` first.

## Git hooks (Husky)

- pre-commit: `lint-staged` (prettier on staged files).
- commit-msg: commitlint, Conventional Commits required (`feat:`, `fix:`, `docs:`...).
- pre-push: `pnpm typecheck && pnpm test`.
- No cloud CI; verification is local.

## Architecture

- `apps/web`: Next.js 15 (App Router, React 19). Routes: landing, `/admin`, and `/s/[tenant]` for public tenant pages.
- `apps/api`: NestJS 10 + Prisma 6 (PostgreSQL). Entry `src/main.ts`, `PrismaModule`/`PrismaService`, `health` controller.
- `packages/schemas` (`@moonlight/schemas`): shared Zod schemas (auth, tenant, blocks, `RESERVED_SLUGS`), compiled to `dist/` and imported by both apps. Pages are stored as JSONB with a `schemaVersion` and validated by the same Zod schema on front and back, so change block shapes here, not in the apps.

- `packages/renderer` (`@moonlight/renderer`): React `PageRenderer` that turns a `PageContent` into the public page. It re-validates with `pageSchema` and passes every URL through `safeHref`. The editor preview should reuse it. Rebuild it (and schemas) after changes, since apps consume `dist/`.

### Analytics

Public tenant pages mount `TrackView` (`apps/web/src/components/track-view.tsx`), which POSTs views and clicks to `/analytics/track` (links carry `data-track-link` from the renderer). The API counts them in Redis (`an:d:*` hashes, `an:u:*` HyperLogLog of daily-salted visitor hashes). `AnalyticsRollupService` consolidates past UTC days into the `analytics_daily` table on boot and via cron at 00:05 UTC. `/analytics/me` merges Postgres rows with live Redis data. CORS in `main.ts` allows `*.ROOT_DOMAIN` origins only for `/analytics/track`, the public report endpoint and `/booking/public/*`, without credentials.

### Backoffice and moderation

Users whose email is listed in `SUPERADMIN_EMAILS` (comma-separated env var) are promoted to `SUPERADMIN` when they confirm a 2FA code. `/backoffice/*` routes use `SessionGuard` then `SuperadminGuard` (checks role in the DB). Moderation = suspending a tenant (`status`, `suspendedReason`; the public endpoint 404s for non-active tenants) plus visitor reports (`TenantReport`, public `POST /tenants/public/:slug/report`, rate-limited). Every admin action writes an `AuditLog` row. UI is at `/admin/backoffice`; the owner sees a suspension notice on `/admin`.

### Booking (optional module)

Per tenant: `bookingEnabled`, `timezone`, `BookingService` (name + duration), `AvailabilityRule` (weekday + minute window in the tenant timezone) and `Booking`. The double-booking guard lives in the database: the `booking` migration adds `btree_gist` and the `bookings_no_overlap` exclusion constraint (`tstzrange("startsAt","endsAt")` per tenant, only for `CONFIRMED`), plus check constraints; Prisma does not model them, so keep them when editing migrations. `BookingService` (API) computes free slots from rules minus confirmed bookings (min notice 2h, max 60 days ahead) using Intl-based helpers in `booking.time.ts`, and maps constraint violations (`23P01`) to 409. Public UI is `/s/[tenant]/agenda`; owner UI is `/admin/agenda`. Emails go through `MailPort`.

### Plans, entitlements and billing

Plans are code, not data: `packages/schemas/src/plans.ts` (`PLANS`, `entitlementsFor`, `resolvePlan`) is shared by API and web. A user without a `Subscription` row, or with a `CANCELED` one, is on FREE. Limits are enforced in the API through `EntitlementsService` (block count in `PagesService` on save and publish, booking in `BookingService` plus public visibility, analytics range clamped in `AnalyticsService`); violations return 403 `{ code: 'PLAN_LIMIT', message }`, which `getErrorMessage` in the web surfaces. Downgrades never delete data, they only block new changes and hide the public booking page. Billing sits behind `BillingPort`; the only adapter is `SandboxBillingService` (fake hosted checkout at `/billing/sandbox/checkout`, sessions in Redis). The plan only changes from signed webhook events (`POST /billing/webhook`, HMAC with `BILLING_WEBHOOK_SECRET`, needs `rawBody: true` in `main.ts`), deduplicated by the unique `BillingEvent.providerEventId`. `BillingRenewalService` simulates period end (renew or cancel) on boot and via cron at 00:10 UTC; a real provider adapter would replace it with the provider's own events.

### Media (image uploads)

`apps/api/src/media`: `POST /media` (multer memory, 5 MB, field `file`) re-encodes every image with sharp to WebP (auto-rotate, max 2000px, metadata stripped, `limitInputPixels` 40M; only JPEG/PNG/WebP/GIF input, SVG refused) and stores it as `{uuid}.webp` through `StoragePort` (only adapter: `LocalStorageService`, dir from `MEDIA_DIR`, public URL built from `API_URL`). `GET /media/files/:name` is public with an immutable cache header and validates the name against `MEDIA_KEY_PATTERN`. Quota is `maxImages` per plan (403 `PLAN_LIMIT`), uploads are rate limited to 40/h per user, and deleting an image still referenced in a page draft or published JSON returns 409. After re-encoding, `NsfwService` classifies the image with NSFWJS (bundled MobileNetV2 model, `@tensorflow/tfjs` CPU backend, no native deps) inside a `worker_threads` worker (`nsfw.worker.ts`, loaded from `dist`) so the API stays responsive; `Porn + Hentai >= NSFW_THRESHOLD` (default 0.6) answers 400 and nothing is stored, `Sexy` alone is allowed, and if the classifier is unavailable the upload fails closed with 503. `NSFW_CHECK_ENABLED=false` turns it off. Pages keep plain image URLs, so external URLs still work. In production the files live in the `media` volume of `deploy/docker-compose.yml`, included by `deploy/backup.sh`. Web side: `components/editor/image-field.tsx` (`ImageField` + library modal), used by the header avatar, hero image and theme background. Animated GIFs become static; a S3/R2 adapter can replace the local one via `StoragePort`.

### Rate limiting

`RateLimitService` (Redis counters, `rl:*` keys) backs `@RateLimit({ name, limit, windowSeconds, perEmail? })` + `RateLimitGuard` (`apps/api/src/redis/rate-limit.guard.ts`), applied to `/auth/register` (5/h per IP), `/auth/login` (10 per 15 min per IP, 5 per 15 min per email) and `/auth/verify` (15 per 15 min per IP); it answers 429 with `Retry-After`. The guard runs before body validation, so the email it reads is normalized by the guard itself. IPs come from `req.ip`; set `TRUST_PROXY` (number of proxy hops) only when the API really sits behind a reverse proxy, otherwise `X-Forwarded-For` is ignored on purpose so it cannot be forged to dodge the limits. Other limits (tracking, reports, booking) call `RateLimitService.allow` directly.

### Deployment

API on a VPS, web on Vercel (README in `deploy/`). `apps/api/Dockerfile` is built with the repo root as context (multi-stage: full install and build, then a clean `--prod` install plus `prisma generate`; `prisma` is a runtime dependency because the container runs `prisma migrate deploy` before starting, see `start:prod`). `deploy/docker-compose.yml` runs `caddy` (TLS, only exposed ports), `api`, `postgres` and `redis` with variables from `deploy/.env` (copy of `deploy/.env.production.example`, never committed). With `NODE_ENV=production` the API refuses to start if `SESSION_SECRET` or `BILLING_WEBHOOK_SECRET` is shorter than 32 chars or an example value, Swagger is off, and the billing sandbox endpoints answer 404 unless `BILLING_SANDBOX_ENABLED=true`. SMTP supports `SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`. The web deploy config is `apps/web/vercel.json` (installs and builds from the monorepo root with Turbo); web and API must share the same root domain so the host-only session cookie works.

### Visual system and page theming

The app UI (landing, `/admin/*`, auth, public booking/report/checkout pages) uses plain CSS in `apps/web/src/app/globals.css`: design tokens on `:root` (light, with dark from `prefers-color-scheme` or `data-theme` set by `ThemeToggle`, persisted in `localStorage` as `sb-theme`), and every app rule inside `@layer app` under the `.app` wrapper (added by `admin/layout.tsx` and the other route layouts). Generic element rules use `:where()` so component classes (`.btn-primary`, `.shell-link`...) always win; buttons of `type="submit"` are primary by default. Do not write inline hex colors in pages, use `var(--...)` tokens and the existing classes (`.card`, `.page`, `.kpi`, `.empty`, `.segmented`, `.badge`...).

Tenant pages are rendered by `packages/renderer`, which is styled independently: it ships its own unlayered stylesheet (`styles.ts`, selectors scoped under `.sbp`, so it beats the layered app CSS even when embedded in the editor or landing) and is driven by CSS variables computed from the theme (`themeStyle`). Responsive sizes use container units (`cqw`), not `vw`. The theme model lives in `packages/schemas/src/theme.ts` (fonts, background solid/gradient/image, button style and shape, radius, spacing, width, optional text color; `THEME_PRESETS`) and block variants in `blocks.ts`; new theme fields must be optional or have defaults so already published pages keep validating. Editor pieces: `components/editor/` (`blocks-panel` with drag and drop, `theme-panel`, `variant-picker` whose thumbnails are real `BlockPreview` renders).

### Blocks catalog

Block types live in `packages/schemas/src/blocks.ts` (discriminated union on `type`, each with a `variant` enum): header, hero, links, text, footer, social, linklist, carousel, gallery, faq, video, divider. Adding a block means touching, in order: the schema (new fields optional or defaulted, `CURRENT_PAGE_SCHEMA_VERSION` stays 1 for additive changes), `packages/renderer/src/blocks.tsx` + `styles.ts`, then in `apps/web` `lib/page-editor.ts` (labels, icons, hints, `VARIANTS`, `sampleBlock`, `describeBlock`, `createBlock`, optional-prop maps used by `normalizePage`), a form in `components/editor/block-forms.tsx` (lists use the generic `ItemList`) and the `BlockForm` switch. `social` icons come from `packages/renderer/src/brand-icons.ts` (paths and brand colors generated from simple-icons, CC0; email and website are stroke icons), with `colorMode` brand, theme or custom (`color` hex); near-black or near-white brand colors fall back to the text color. `video` accepts only YouTube and Vimeo links through `parseVideoUrl` (schemas), rendered as a sandboxed `youtube-nocookie.com` or `player.vimeo.com` iframe. `carousel` is CSS scroll-snap; its arrow buttons are wired by `CarouselControls` (web, one delegated click listener) on public pages and in the editor preview. `BlockPreview` renders with `thumbnail: true` (no iframes or buttons) because variant thumbnails sit inside buttons.

### API validation and docs

Request bodies are validated by a global `ZodValidationPipe` from `nestjs-zod`. DTOs are built with `createZodDto(schema)` from the shared schemas (see `apps/api/src/auth/auth.dto.ts`), which also feeds Swagger. Swagger UI is served at `/docs` outside production.

### Tenant resolution (spans several files)

`apps/web/src/middleware.ts` calls `getTenantSlugFromHost` (`src/lib/tenant-host.ts`) against `ROOT_DOMAIN` (env, default `localhost:3000`). A single-level subdomain that is not in `RESERVED_SLUGS` (`maria.localhost:3000`) is internally rewritten to `/s/maria/...`. The root domain is untouched, so landing and `/admin` work. `/s/[tenant]` is also directly reachable as a path fallback for hosts without wildcard subdomains.

### Design decisions (from README)

- Session cookie is host-only on the main domain so tenant pages never receive the admin session.
- Prisma is the ORM, with raw SQL in migrations for features it can't model (e.g. `tstzrange` exclusion constraints for the future scheduling module).
- Email, storage, and billing sit behind interfaces so adapters can be swapped without touching the domain.
- Dev services: Mailpit catches 2FA emails. Uploaded images live on local disk (`MEDIA_DIR`) behind `StoragePort`. Config in `.env.example`.

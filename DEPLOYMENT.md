# Karame Bay Railway Deployment Guide

This guide is based on the current repository state. It does not deploy anything.

## Current application shape

The codebase is currently one Next.js application containing:

- Customer website routes.
- Admin portal routes.
- Rider portal routes.
- Backend API route handlers.
- Prisma database access.

It is not currently split into separate apps or a monorepo. The requested Railway target is:

- Customer Website service: `karamebay.com`
- Staff Portal service for Admin and Rider: `portal.karamebay.com`
- Backend API service: `api.karamebay.com`
- One PostgreSQL database service

Because the current app is one integrated Next.js app, there are two safe deployment paths:

1. Short-term: deploy the same Next.js app as separate Railway services/domains while keeping strict route access controls. Build and start commands are the same for each service.
2. Cleaner production architecture: split customer, staff, and API into separate applications or add domain-aware routing/middleware before deployment.

Do not assume the services are already physically separated.

## A. Preparation

Before creating Railway services:

- Commit the final production branch to GitHub.
- Confirm which branch Railway should deploy.
- Run locally:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

- Confirm `.env` is not committed.
- Confirm `.env*` remains in `.gitignore`.
- Review hardcoded development origins:
  - `src/lib/portal-urls.ts` defaults to `http://127.0.0.1:3000` and `http://localhost:3000`.
  - test scripts default to localhost.
  - `next.config.ts` has `allowedDevOrigins` for local development only.
- Replace local upload storage before production.
- Confirm the PostgreSQL baseline migration validates before using Railway PostgreSQL.

## B. Railway project creation

Create one Railway project named:

```text
Karame Bay
```

Add:

1. PostgreSQL service.
2. Customer Website service from the GitHub repository.
3. Staff Portal service from the same GitHub repository.
4. Backend API service from the same GitHub repository, or deploy a single combined service until the app is split.

Because this is not currently a monorepo, the root directory for each service is the repository root.

Build command for each current app service:

```bash
npm run build
```

Start command for each current app service:

```bash
npm run start
```

Install command:

```bash
npm install
```

Pre-deploy migration command:

```bash
npm run db:migrate:deploy
```

Do not run:

```bash
npm run db:setup
npm run db:seed
npx prisma migrate reset
```

against production.

Railway injects `PORT`. `next start` respects the `PORT` environment variable. If a custom server is ever added, it must listen on `0.0.0.0` and `process.env.PORT`.

## C. Database

`prisma/schema.prisma` now uses:

```prisma
provider = "postgresql"
```

Before production:

1. Create a fresh Railway PostgreSQL database.
2. Run `npm run db:migrate:deploy`.
3. Export the cleaned catalog/admin dataset from the source database.
4. Import the catalog-only export into Railway PostgreSQL.
5. Verify stores, products, categories, add-ons, store types, settings, and zero operational records.

Use Railway's PostgreSQL `DATABASE_URL` reference variable for the application services.

Never run destructive resets or development seeds on production.

The old SQLite migration history is archived at `prisma/migrations_sqlite_legacy/`. Railway must use only the active PostgreSQL migrations under `prisma/migrations/`.

Catalog-only transfer:

```bash
npm run data:export-production-catalog
npm run data:import-production-catalog -- --in=backups/production-catalog-export.json
PRODUCTION_CATALOG_IMPORT_CONFIRM=IMPORT_KARAME_PRODUCTION_CATALOG npm run data:import-production-catalog -- --in=backups/production-catalog-export.json
```

The first import command is a dry run. The confirmed command imports only preserved Admin/catalog/settings data and refuses to run if the target database contains customers, riders, orders, parcels, notifications, or assignments.

Production operational cleanup is now available as a guarded one-time command. It is not part of startup or deployment:

```bash
npm run cleanup:production-operational -- --dry-run
PRODUCTION_CLEANUP_CONFIRM=CLEAN_KARAME_PRODUCTION_OPERATIONAL_DATA npm run cleanup:production-operational
```

Always create a database backup before running the confirmed command.

## D. Environment variables

### Server-only secrets

Use only in server services. Never expose these as `NEXT_PUBLIC_`:

- `DATABASE_URL`
- `AUTH_SECRET`
- `PARCEL_CONFIRMATION_SECRET`
- `CRON_SECRET`
- `GMAIL_SMTP_APP_PASSWORD`
- `SEED_ACCOUNT_PASSWORD`
- `TEST_ACCOUNT_PASSWORD`

### Shared public build-time values

These are read by the Next.js app and may be bundled because they use `NEXT_PUBLIC_`:

- `NEXT_PUBLIC_CUSTOMER_ORIGIN`
- `NEXT_PUBLIC_STAFF_ORIGIN`

Production values:

```text
NEXT_PUBLIC_CUSTOMER_ORIGIN=https://karamebay.com
NEXT_PUBLIC_STAFF_ORIGIN=https://portal.karamebay.com
```

### Backend/API URL

There is no `API_URL` or `NEXT_PUBLIC_API_URL` currently used in the code. API routes are same-origin Next.js routes.

If `api.karamebay.com` becomes a real separate backend service, the code must be updated to use that API origin safely.

### Gmail SMTP

Required for real email delivery:

- `GMAIL_SMTP_HOST`
- `GMAIL_SMTP_PORT`
- `GMAIL_SMTP_SECURE`
- `GMAIL_SMTP_USER`
- `GMAIL_SMTP_APP_PASSWORD`
- `EMAIL_FROM_NAME`
- `EMAIL_FROM_ADDRESS`

### Price import and cron

- `CRON_SECRET`
- `TUMA250_CRON_STORE_SLUG`
- `ESOKO_PRICE_TRENDS_URL`
- `ESOKO_PUBLIC_API_URL`
- `ESOKO_TARGET_MARKET`
- `ESOKO_KIMIRONKO_MARKET_ID`
- `ESOKO_PRICE_TYPE`
- `ESOKO_REQUEST_TIMEOUT_MS`
- `ESOKO_MAX_RETRIES`
- `ESOKO_REQUEST_DELAY_MS`
- `ESOKO_MAX_RECORDS`
- `ESOKO_USER_AGENT`

## E. Cloudinary and image storage

Cloudinary-backed Admin image uploads and parcel proof uploads are implemented through backend routes. Existing local image references still need to be migrated after Cloudinary environment variables are configured.

Legacy/local upload references still to migrate:

- Admin product/store/type uploads: `public/uploads/...`
- Customer profile photos: new uploads now go to Cloudinary; migrate any old `public/uploads/profiles/...` references if they exist in production data.
- Parcel photos and delivery proof media: new uploads now go to Cloudinary; preserved production data currently has no parcel proof media records.

Railway filesystem storage is temporary and not suitable for permanent business images. Before production, implement Cloudinary or equivalent durable object storage for:

- Product images.
- Store logos.
- Store cover images.
- Store type/category images.
- Customer profile photos if retained.
- Parcel pickup/delivery proof media, with private access controls.

Required Cloudinary variables:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER`

Run the media migration after configuring Cloudinary:

```bash
npm run images:migrate-cloudinary -- --dry-run
CLOUDINARY_MIGRATION_CONFIRM=MIGRATE_KARAME_LOCAL_IMAGES_TO_CLOUDINARY npm run images:migrate-cloudinary
```

Do not delete local originals until every migrated image URL has been verified in the app.

## F. Gmail SMTP

SMTP configuration:

- Host: `smtp.gmail.com`
- Port: `587` when `GMAIL_SMTP_SECURE=false` and STARTTLS is used.
- Account: `karamebay3@gmail.com`
- App Password: store only in Railway variables as `GMAIL_SMTP_APP_PASSWORD`.

Do not place the real Gmail App Password in docs or Git.

Customer order emails should be sent only for:

- Order Accepted.
- Order Delivered.

Other order status updates should remain internal notifications.

## G. Domains

Add custom domains inside each Railway service:

- Customer service: `karamebay.com`
- Staff service: `portal.karamebay.com`
- API service: `api.karamebay.com`

Railway generates the DNS records during setup. Add those exact generated records at the external domain registrar. Do not invent DNS values.

Railway provisions SSL automatically after DNS is connected.

## H. CORS, cookies, and security

Current app security:

- Role-specific HTTP-only cookies:
  - `karame_customer_session`
  - `karame_admin_session`
  - `karame_rider_session`
- `sameSite: "lax"`
- Secure cookies are enabled in production unless `SESSION_COOKIE_SECURE=false`.
- Security headers are configured in `next.config.ts`.
- Basic in-memory rate limiting exists for selected endpoints.
- Input validation uses Zod in many API routes.

Production requirements:

- Use HTTPS only.
- Do not set `SESSION_COOKIE_SECURE=false` in production.
- Confirm cookie behavior across `karamebay.com` and `portal.karamebay.com`.
- Configure production customer origin and staff origin.
- Do not expose stack traces or secrets to users.
- Add durable/distributed rate limiting if multiple service instances are used.
- Review CORS if API is split to `api.karamebay.com`. The current code does not define a separate CORS policy because API calls are same-origin.

## I. Deployment order

1. PostgreSQL.
2. Backend API or combined Next.js service.
3. Customer Website.
4. Staff Portal.
5. Custom domains.
6. Production testing.

For the current single-app repository, deploy a staging combined service first and verify all roles.

## J. Rollback

Application rollback:

- Use Railway deployment history to redeploy a previous successful deployment.
- Verify environment variables are unchanged.
- Smoke test customer, admin, rider, checkout, orders, and parcel flows.

Database rollback:

- Do not restore directly onto production first.
- Restore the backup into a separate test database.
- Verify data and schema.
- Schedule a maintenance window if production restore is needed.
- Stop writes during restore.
- Restore using `pg_restore` or `psql` depending on backup format.
- Re-run verification after restore.

Failed migration recovery:

- Stop the affected deployment.
- Inspect migration status.
- Restore from the most recent verified backup if the migration corrupted data.
- Do not run `migrate reset` in production.

## Railway readiness verdict

PostgreSQL support was live-tested locally with Docker PostgreSQL. Railway PostgreSQL still needs the same migration/import procedure during deployment.

Deployment blockers:

1. Run `npm run db:migrate:deploy` against a real empty PostgreSQL database.
2. Import and verify the catalog-only export in PostgreSQL.
3. Complete Cloudinary migration for existing local image references.
4. The requested three-service architecture is not physically separated in the repository.
5. Production data restore test has not been completed.

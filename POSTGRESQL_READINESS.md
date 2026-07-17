# Karame Bay PostgreSQL Readiness

This document records the PostgreSQL production-prep work before Railway deployment.

No Railway deployment, custom-domain connection, or Cloudinary image migration has been performed.

## Current database stack

- ORM: Prisma `6.19.3`
- Schema: `prisma/schema.prisma`
- Active provider: PostgreSQL
- Active migrations: `prisma/migrations/`
- Legacy migrations: `prisma/migrations_sqlite_legacy/`
- Seed: `prisma/seed.ts`, development-only and locked
- Production database variable: `DATABASE_URL`

The old SQLite migrations were archived because Railway must not replay SQLite SQL against PostgreSQL.

## IDs, money, and compatibility

- Primary keys are string CUIDs unless a model intentionally uses a fixed singleton ID.
- Money is stored as integer RWF fields, not floating-point values.
- Floating-point fields remain only for coordinates, ratings, measurements, percentages, and quantities where fractional values are expected.
- Prisma `Json` fields are used only where structured overrides are required.
- PostgreSQL case-insensitive search now uses Prisma query mode `insensitive` in customer/store search paths.
- Runtime schema creation for email logs was removed; schema changes now belong to migrations.

## Production migration commands

Generate the Prisma client:

```bash
npm run db:generate
```

Run migrations on Railway/PostgreSQL:

```bash
npm run db:migrate:deploy
```

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

Health check:

```text
/api/health
```

## Data-transfer method

Selected method: catalog-only export/import.

This is safer than importing the full development database because the fresh launch must exclude customers, riders, orders, parcel requests, assignments, notifications, payments, carts, addresses, reviews, sessions, and other operational records.

Export from the cleaned source database:

```bash
npm run data:export-production-catalog
```

Dry-run import into an empty migrated PostgreSQL database:

```bash
npm run data:import-production-catalog -- --in=backups/production-catalog-export.json
```

Confirmed import:

```bash
PRODUCTION_CATALOG_IMPORT_CONFIRM=IMPORT_KARAME_PRODUCTION_CATALOG npm run data:import-production-catalog -- --in=backups/production-catalog-export.json
```

The import script refuses to run if the target database already contains operational data.

## Latest preserved source counts

The local catalog-only export created during this pass contained:

- Admin users: 1
- Store types: 3
- Stores: 3
- Restaurant products: 182
- Restaurant categories: 20
- Restaurant variants: 31
- Restaurant choice groups: 217
- Restaurant choice options: 700
- Restaurant add-ons: 11
- Restaurant product add-on links: 42
- Marketplace products: 1113
- Marketplace departments: 10
- Marketplace categories: 42
- Marketplace units: 1113
- Marketplace inventory rows: 1113
- Legacy category rows: 17
- Legacy product rows: 65
- Parcel categories/settings/prohibited rules: preserved

Operational data after cleanup remains intentionally excluded from the export.

## Local verification performed

- `npm run data:export-production-catalog` succeeded.
- `npx prisma generate` succeeded after stopping the local Next process that was locking Prisma's Windows query engine.
- `npm run typecheck` succeeded.
- `DATABASE_URL=postgresql://... npx prisma validate` succeeded.
- Docker PostgreSQL `postgres:16-alpine` test database started successfully on local port `55432`.
- `npm run db:migrate:deploy` succeeded on an empty PostgreSQL database.
- `npm run db:migrate:deploy` succeeded a second time with no pending migrations.
- Catalog-only import dry run succeeded.
- Confirmed catalog-only import succeeded.
- PostgreSQL verification counts confirmed:
  - Active Admin users: 1
  - Customers: 0
  - Riders: 0
  - Orders: 0
  - Order items: 0
  - Parcels: 0
  - Notifications: 0
  - Stores: 3
  - Store types: 3
  - Restaurant products: 182
  - Marketplace products: 1113
  - Restaurant choice groups: 217
  - Restaurant choice options: 700
  - Restaurant add-ons: 11
  - Restaurant product add-on links: 42
- `npm run build` succeeded against the live PostgreSQL test database.
- `npm run start` succeeded on port `3100` against PostgreSQL.
- `/api/health` returned `{"ok":true,"service":"karame-bay","database":"reachable"}`.
- Cloudinary media metadata migration `20260717152000_cloudinary_media_metadata` was added after the original PostgreSQL readiness pass.
- A fresh PostgreSQL test database applied both migrations successfully and idempotently.

## Verification still required before Railway launch

The local PostgreSQL readiness test passed. Before Railway launch, repeat the same steps against the Railway PostgreSQL database or a Railway staging PostgreSQL database:

1. `npm run db:migrate:deploy`
2. Run it a second time to confirm idempotency.
3. Import the catalog-only export with the confirmed import command.
4. Verify Admin login.
5. Verify store types, Java House Kigali Heights, Karame Bay Market, products, prices, restaurant menus, variants, add-ons, choice groups, retail departments/categories, and product search.
6. Verify zero customers, zero riders, zero orders, and zero notifications in the fresh production database.
7. Create and remove temporary customer/rider/order records only in an isolated test database.

## Remaining blockers

- Railway PostgreSQL itself has not been migrated/imported yet.
- Cloudinary migration is intentionally still pending.
- Parcel proof uploads now target Cloudinary in code; existing preserved data currently has no parcel proof media to migrate.
- The repository is still one integrated Next.js application, even if Railway later serves it behind separate customer/staff/API domains.

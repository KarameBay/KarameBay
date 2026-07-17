# Karame Bay

Karame Bay is a multi-service delivery marketplace for Rwanda. The current codebase is a single Next.js application that contains the customer website, Admin portal, Rider portal, API routes, and Prisma database layer.

The platform currently supports:

- Customer accounts, email verification, required Rwanda phone numbers, saved addresses, carts, checkout, order history, notifications, reviews, and parcel bookings.
- Food ordering through the Restaurant Menu Engine.
- Retail shopping through the Retail Catalog Engine.
- Parcel delivery with pickup/delivery routing, MoMo payment confirmation, Admin review, rider assignment, and rider delivery updates.
- Manual rider assignment only. Admin assigns riders; riders do not self-assign ordinary store orders.
- Dynamic store types created by Admin. Store types are not limited to Restaurant, Market, Pharmacy, Drinks Store, Grocery Store, Bakery, or any fixed list. Admin can create future store types without changing application code, then assign each type to one of the existing engines.

## Roles

- Customer: browses stores, orders restaurant/retail products, books parcels, tracks orders, reviews completed orders, and manages account details.
- Admin: manages store types, stores, restaurant menus, retail catalogs, products, prices, images, customers, riders, orders, parcel deliveries, payment verification, reports, notifications, and settings.
- Rider: receives Admin-assigned deliveries, views routes, updates delivery statuses, and completes assigned store or parcel deliveries.

## Existing stores and data preservation

The current business data must be preserved:

- Java House Kigali Heights uses the Restaurant Menu Engine.
- Karame Bay Market uses the Retail Catalog Engine.
- Existing stores, store types, products, categories, prices, uploaded images, add-ons, choice groups, customers, orders, riders, reviews, parcel deliveries, and notifications must not be reset or deleted.

Do not run destructive reset commands against the production database.

## Customer email rules

The application sends customer emails through Gmail SMTP for:

- Customer email verification.
- Password reset code.
- Order Accepted.
- Order Delivered.
- SMTP test email from Admin settings.

Other order status updates should remain internal application notifications unless the code is intentionally changed.

## Technology stack

- Language: TypeScript.
- Framework: Next.js 16.2.9 App Router.
- UI: React 19.2.4, CSS modules/global CSS, lucide-react icons.
- Backend: Next.js route handlers under `src/app/api`.
- ORM: Prisma 6.19.3.
- Database provider: PostgreSQL, configured in `prisma/schema.prisma`.
- Authentication: custom email/password auth, bcrypt password hashing, jose JWT session tokens, server-side session records.
- Maps/routing: OpenStreetMap/Nominatim and public OSRM routing.
- Email: custom SMTP client using Gmail SMTP.
- Uploads: Admin catalog/store/profile uploads and parcel proof uploads use Cloudinary. Existing local catalog/store image references still need migration before Railway production.

## Repository structure

```text
.
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ migrations/
├─ public/
│  └─ uploads/
├─ scripts/
├─ src/
│  ├─ app/
│  │  ├─ admin/
│  │  ├─ api/
│  │  ├─ auth/
│  │  ├─ customer/
│  │  ├─ explore/
│  │  ├─ rider/
│  │  └─ stores/
│  ├─ components/
│  └─ lib/
├─ next.config.ts
├─ package.json
└─ tsconfig.json
```

This is not currently a monorepo. Customer, Admin, Rider, and API code live in one Next.js app.

## Local requirements

- Node.js `>=20.9.0 <23`
- npm
- Prisma CLI from project dependencies

Install dependencies:

```bash
npm install
```

## Environment setup

Copy `.env.example` to `.env` and fill the local values:

```bash
cp .env.example .env
```

Required local values include:

- `DATABASE_URL`
- `AUTH_SECRET`
- `PARCEL_CONFIRMATION_SECRET`
- `NEXT_PUBLIC_CUSTOMER_ORIGIN`
- `NEXT_PUBLIC_STAFF_ORIGIN`
- Gmail SMTP variables if email sending is required locally

Never commit `.env` or real secrets.

## Database setup

Current Prisma datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Generate Prisma client:

```bash
npm run db:generate
```

Apply migrations in development:

```bash
npm run db:migrate
```

Apply migrations in production/Railway:

```bash
npm run db:migrate:deploy
```

The project also has:

```bash
npm run db:setup
```

This runs `prisma db push && npm run db:seed`. Use it only for disposable local development databases.

## Seed instructions

A real seed script exists at `prisma/seed.ts`, but it is intentionally locked:

- It throws when `NODE_ENV=production`.
- It requires `ALLOW_DEVELOPMENT_SEED=true`.
- It requires `SEED_ACCOUNT_PASSWORD` with at least 12 characters.

Do not run the seed script against production. It contains development setup behavior and can overwrite development data.

## Development commands

```bash
npm run dev
npm run lint
npm run typecheck
```

The local development server defaults to Next.js port `3000`.

## Production build and start

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

`npm run start` runs `next start`. On Railway, set `PORT` in the environment or let Railway inject it.

## Verification scripts

Available project scripts include:

```bash
npm run test:phase1
npm run test:catalog-engines
npm run test:store-types
npm run test:esoko-importer
npm run test:tuma250-importer
npm run test:customer-verification
npm run test:password-reset
npm run test:role-logins
npm run test:role-isolation
npm run test:parcel-delivery
npm run test:reviews-support
npm run audit:production
```

Most verification scripts expect the app to be running and may use `TEST_BASE_URL` and `TEST_ACCOUNT_PASSWORD`.

## Important deployment notes

- Railway production must use the Railway-provided PostgreSQL `DATABASE_URL`.
- The active migration path is a PostgreSQL baseline in `prisma/migrations/`.
- Legacy SQLite migrations were archived under `prisma/migrations_sqlite_legacy/` and must not be used by Railway.
- New uploaded images and parcel proof media use Cloudinary. Existing local media references must be migrated before Railway production.
- A guarded operational cleanup script exists for fresh launch preparation: `npm run cleanup:production-operational`.
- A catalog-only data transfer path exists:
  - Export from the cleaned source database: `npm run data:export-production-catalog`
  - Import into an empty migrated PostgreSQL database: `PRODUCTION_CATALOG_IMPORT_CONFIRM=IMPORT_KARAME_PRODUCTION_CATALOG npm run data:import-production-catalog -- --in=backups/export.json`
- A guarded local-image migration script exists: `npm run images:migrate-cloudinary`.
- The intended production architecture has separate customer, staff, and backend services, but the repository is currently one Next.js application. Either deploy the same app behind separate domains with strict route/origin controls, or split the services before launch.

## Troubleshooting

- `AUTH_SECRET must contain at least 32 characters`: set a long random `AUTH_SECRET`.
- Gmail emails not sending: configure `GMAIL_SMTP_USER` and `GMAIL_SMTP_APP_PASSWORD`; verify Gmail 2-Step Verification and App Password setup.
- Uploaded images disappear after deployment: local filesystem upload storage is being used; configure durable storage.
- Role collision in one browser: the app uses separate cookies for customer, admin, and rider sessions: `karame_customer_session`, `karame_admin_session`, and `karame_rider_session`.
- Route or geocoding failures: OpenStreetMap/Nominatim or OSRM may be temporarily unavailable or rate-limiting requests.

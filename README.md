# Karame Bay — Phase 1

Karame Bay is a multi-vendor delivery marketplace for Kigali. Phase 1 contains the customer catalog, persistent single-store cart, OpenStreetMap/OSRM delivery routing, Mobile Money checkout, customer tracking, and isolated Customer, Admin, and Rider sessions.

OCR and screenshot catalog import are intentionally not included yet.

## Catalog engines

Stores are classified with one of two independent normalized engines:

- `RESTAURANT`: menu categories, subcategories, products, variants, choice groups, choices, add-ons, combo components, dietary metadata and special-instruction support.
- `MARKETPLACE`: departments, categories, products, units, decimal-quantity rules, inventory, low-stock thresholds, discounts and stock history.

Java House Kigali Heights uses the Restaurant Menu Engine. Marketplace stores use the normalized Marketplace Catalog Engine. Store, menu, catalog, order, payment, and rider operations are managed by administrators.

## Local setup

```bash
npm install
npm run db:generate
npm run dev
```

Open:

- Customer portal: `http://127.0.0.1:3000/customer/login`
- Admin portal: `http://localhost:3000/admin/login`
- Rider portal: `http://localhost:3000/rider/login`
- Marketplace: `http://127.0.0.1:3000/stores`

Role-specific HTTP-only cookies keep Customer, Admin, and Rider sessions isolated, allowing all three portals to remain signed in simultaneously.

## Development seed safety

The development seed is destructive and is disabled by default. It will not run in production. To use it with a disposable local database, explicitly set `ALLOW_DEVELOPMENT_SEED=true` and provide a unique `SEED_ACCOUNT_PASSWORD` of at least 12 characters.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

With the app running locally, the lifecycle regression test creates a real routed test order and processes it through payment verification, store preparation, rider assignment, and delivery:

```bash
npm run test:phase1
```

## Security and deployment notes

- Public registration always creates a Customer account.
- Admin, Store Owner, and Rider accounts use the separate Staff Portal.
- Passwords are bcrypt-hashed and sessions use signed HTTP-only cookies backed by revocable database sessions.
- Production authentication must be served over HTTPS because session cookies are secure in production.
- Prices and delivery fees are recomputed by the server before an order is created.
- SQLite is suitable for this local Phase 1 build. Move to managed PostgreSQL before multi-instance production deployment.
- Replace `AUTH_SECRET` with a strong deployment secret.

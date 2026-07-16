# Karame Bay — Phase 1

Karame Bay is a multi-vendor delivery marketplace for Kigali. Phase 1 contains the customer catalog, persistent single-store cart, OpenStreetMap/OSRM delivery routing, Mobile Money checkout, customer tracking, and separate Admin, Store Owner, and Rider workspaces.

OCR and screenshot catalog import are intentionally not included yet.

## Catalog engines

Stores are classified with one of two independent normalized engines:

- `RESTAURANT`: menu categories, subcategories, products, variants, choice groups, choices, add-ons, combo components, dietary metadata and special-instruction support.
- `MARKETPLACE`: departments, categories, products, units, decimal-quantity rules, inventory, low-stock thresholds, discounts and stock history.

Java House Kigali Heights uses the Restaurant Menu Engine. Kimironko Market and Zinia Kicukiro Market use separate Marketplace Catalog Engine records. The previous `Product`/`Category` models remain temporarily as an owner-dashboard compatibility bridge and are mirrored into the correct engine until the dedicated visual builders replace them.

## Local setup

```bash
npm install
npm run db:setup
npm run dev
```

Open:

- Customer portal: `http://127.0.0.1:3000/customer/login`
- Staff portal: `http://localhost:3000/staff/login`
- Marketplace: `http://127.0.0.1:3000/stores`

The separate local hostnames intentionally keep Customer and Staff cookies isolated, allowing both portals to stay signed in simultaneously in the same browser.

## Seed accounts

All seed accounts use the development password `Karame@2026`.

| Role        | Email                          |
| ----------- | ------------------------------ |
| Customer    | `customer@karamebay.rw`        |
| Rider       | `rider@karamebay.rw`           |
| Admin       | `admin@karamebay.rw`           |
| Store Owner | `java.owner@karamebay.rw`      |
| Store Owner | `kimironko.owner@karamebay.rw` |
| Store Owner | `zinia.owner@karamebay.rw`     |

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

# Karame Bay Backup and Recovery Guide

Karame Bay stores critical business data: customers, phone numbers, email verification status, stores, store types, products, restaurant menus, add-ons, retail categories, prices, inventory, orders, payments, riders, parcels, reviews, notifications, and image references.

Backups are required before every deployment, migration, import, bulk edit, or production data change.

## What must be protected

- Users, roles, sessions, verification records, and password reset records.
- Stores and dynamic store types.
- Java House Kigali Heights restaurant menu data.
- Karame Bay Market retail catalog data.
- Restaurant variants, choice groups, add-ons, and product links.
- Retail departments, categories, products, units, inventory, price history, and import records.
- Orders, payments, order items, rider assignments, and notifications.
- Parcel deliveries, parcel payments, parcel media records, parcel rider assignments, and parcel status events.
- Reviews and business settings.
- Image URLs, storage keys, and external media public IDs after Cloudinary is implemented.

## Railway backups and PostgreSQL exports

Railway database backups and manual PostgreSQL exports serve different purposes:

- Railway backups are useful for platform-level recovery depending on the selected Railway plan.
- Manual `pg_dump` exports are portable and can be restored into a separate database for verification.

Use both when available.

## Manual PostgreSQL backup

Use placeholders only:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file "karame-bay-YYYY-MM-DD.dump"
```

Plain SQL option:

```bash
pg_dump "$DATABASE_URL" --no-owner --no-acl --file "karame-bay-YYYY-MM-DD.sql"
```

Store backups securely outside the repository. Do not commit dumps to Git.

## Backup frequency

Recommended minimum:

- Daily automated production database backup.
- Manual backup before every migration or bulk import.
- Manual backup before approving large Tuma250/price import batches.
- Manual backup before changing product structures or store types.

Recommended retention:

- Daily backups for 14 days.
- Weekly backups for 8 weeks.
- Monthly backups for 12 months.

Adjust based on Railway plan and business risk.

## Verify a backup

Never verify by restoring directly over production.

1. Create a separate test PostgreSQL database.
2. Restore the backup there.
3. Point a local/staging app to the test database.
4. Verify data counts and key workflows.

Restore a custom-format dump into a test database:

```bash
createdb karame_restore_test
pg_restore --dbname "postgresql://USER:PASSWORD@HOST:PORT/karame_restore_test" --clean --if-exists --no-owner --no-acl "karame-bay-YYYY-MM-DD.dump"
```

Restore plain SQL into a test database:

```bash
createdb karame_restore_test
psql "postgresql://USER:PASSWORD@HOST:PORT/karame_restore_test" --file "karame-bay-YYYY-MM-DD.sql"
```

## Production restore procedure

1. Confirm the incident and choose the restore point.
2. Restore into a separate test database first.
3. Verify stores, products, users, orders, riders, add-ons, images, parcels, and reviews.
4. Announce maintenance window.
5. Stop production writes.
6. Take a fresh emergency backup of the current production database.
7. Restore using the selected backup.
8. Run smoke tests.
9. Re-enable traffic.

Do not test restore procedures directly on the live production database.

## Failed migration handling

Before migration:

- Create a fresh backup.
- Test the migration against a restored copy.
- Confirm Prisma schema and database provider match production.
- Run `npm run cleanup:production-operational -- --dry-run` and save the output when preparing a fresh launch.
- For fresh Railway launch, create a catalog-only export before transfer:

```bash
npm run data:export-production-catalog
```

- Import that file only into an empty PostgreSQL database after migrations:

```bash
npm run db:migrate:deploy
npm run data:import-production-catalog -- --in=backups/production-catalog-export.json
PRODUCTION_CATALOG_IMPORT_CONFIRM=IMPORT_KARAME_PRODUCTION_CATALOG npm run data:import-production-catalog -- --in=backups/production-catalog-export.json
```

If migration fails:

- Stop the new deployment.
- Do not run `prisma migrate reset`.
- Inspect migration status.
- Restore from the verified backup if data was damaged.
- Redeploy the last known-good application version.

## Cloudinary and image recovery

Admin catalog/store image upload and parcel proof upload now target Cloudinary when Cloudinary environment variables are present. Existing local references must still be migrated with the explicit Cloudinary migration script.

After Cloudinary is implemented:

- Database backups protect image URLs and public IDs.
- Cloudinary assets themselves must be protected through Cloudinary account security, folder organization, and provider backup/export options.
- Cloudinary API credentials must be stored in Railway variables and password manager storage, not Git.

One-time migration command:

```bash
npm run images:migrate-cloudinary -- --dry-run
CLOUDINARY_MIGRATION_CONFIRM=MIGRATE_KARAME_LOCAL_IMAGES_TO_CLOUDINARY npm run images:migrate-cloudinary
```

If the database is restored but Cloudinary assets are missing, product/store/parcel records may point to broken images.

## Post-restore verification checklist

- [ ] Java House Kigali Heights exists.
- [ ] Karame Bay Market exists.
- [ ] Dynamic store types exist and are active as expected.
- [ ] Restaurant categories and menu items exist.
- [ ] Restaurant variants, choice groups, and add-ons exist.
- [ ] Retail departments, categories, products, units, and inventory exist.
- [ ] Product prices and container charges are correct.
- [ ] Customers exist.
- [ ] Admin users exist.
- [ ] Riders and rider profiles exist.
- [ ] Orders, payments, and order items exist.
- [ ] Rider assignments exist.
- [ ] Parcel deliveries and parcel payments exist.
- [ ] Reviews exist.
- [ ] Uploaded image references still resolve.
- [ ] Login works for Customer, Admin, and Rider.
- [ ] Checkout and order tracking work.

## Disaster-recovery checklist

- [ ] Identify incident.
- [ ] Freeze writes if data corruption is ongoing.
- [ ] Preserve logs.
- [ ] Take emergency backup.
- [ ] Select verified restore point.
- [ ] Restore into test database.
- [ ] Verify restored data.
- [ ] Restore production during maintenance window.
- [ ] Smoke test all roles.
- [ ] Confirm email, routing, uploads, and payments.
- [ ] Document cause and prevention.

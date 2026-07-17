# Karame Bay Media Storage Readiness

No Railway deployment, domain connection, or Cloudinary credential exposure has been performed.

## Upload locations discovered

- `src/app/api/admin/uploads/images/route.ts`
  - Admin upload endpoint for store logos, store covers, store-type images, product images, and menu images.
  - Accepts JPG, PNG, WebP.
  - Maximum size: 8 MB.
  - Public catalog/store media.
- `src/lib/auth/profile-photo.ts`
  - Customer profile photo helper used by registration/profile update.
  - Accepts JPG, PNG, WebP.
  - Maximum size: 5 MB.
- `src/app/api/parcels/route.ts`
  - Customer parcel booking optional parcel photo.
  - Accepts JPG, PNG, WebP.
  - Maximum size: 6 MB.
- `src/app/api/rider/parcels/[id]/media/route.ts`
  - Rider pickup/delivery proof photos.
  - Accepts JPG, PNG, WebP.
  - Maximum size: 6 MB.
- `src/app/api/parcels/media/[id]/route.ts`
  - Protected media access route. It verifies the requesting user, then redirects to the Cloudinary URL.

No multer usage was found. Videos are not supported for launch.

## Local storage dependencies removed

- Parcel proof uploads no longer write to `storage/parcel-media`.
- Parcel media reading no longer depends on local files.
- Parcel media records now store Cloudinary URL/public ID metadata.

Development utility scripts still exist that can write local image assets, such as market image enrichment scripts. These are not production upload routes and should not be run during Railway deployment.

## Database media fields

Added by migration `20260717152000_cloudinary_media_metadata`:

- `User.profilePhotoPublicId`
- `Store.logoPublicId`
- `Store.coverPublicId`
- `StoreType.iconPublicId`
- `StoreType.imagePublicId`
- `RestaurantCategory.imagePublicId`
- `RestaurantProduct.imagePublicId`
- `MarketplaceProduct.imagePublicId`
- `Product.imagePublicId`
- `ParcelMedia.url`
- `ParcelMedia.publicId`
- `ParcelMedia.resourceType`
- `ParcelMedia.width`
- `ParcelMedia.height`
- `ParcelMedia.format`

`ParcelMedia.storageKey` is retained for compatibility and now stores the Cloudinary public ID for new uploads.

## Migration commands

Dry run:

```bash
npm run images:migrate-cloudinary -- --dry-run
```

Confirmed migration:

```bash
CLOUDINARY_MIGRATION_CONFIRM=MIGRATE_KARAME_LOCAL_IMAGES_TO_CLOUDINARY npm run images:migrate-cloudinary
```

The script does not delete local source files.

## Latest dry-run result

Against the PostgreSQL test database, the media migration dry-run found 7 local references:

- Store logo: Java House Kigali Heights
- Store cover: Java House Kigali Heights
- Store cover: Karame Bay Market
- Store logo: Karame Sip
- Store cover: Karame Sip
- Store type icon: Karame Sip
- Store type image: Karame Sip

No preserved parcel proof media records were found.

## Verification performed

- Prisma schema validation passed.
- Prisma client generation passed.
- `npm run typecheck` passed.
- Fresh PostgreSQL database applied both migrations successfully.
- Migration deploy was re-run successfully with no pending migrations.
- Production catalog import succeeded into the updated PostgreSQL schema.
- Cloudinary migration dry-run succeeded and reported the 7 local references above.

## Build note

`next build` compiled successfully but the local Next build worker crashed during the TypeScript phase with a Node heap/worker exit issue on this machine. Standalone `npm run typecheck` passes. Re-run `npm run build` in Railway or a staging machine with sufficient memory before launch.

## Remaining blockers

- Cloudinary credentials must be configured before running the confirmed media migration.
- The 7 existing local media references must be migrated and visually verified.
- Railway PostgreSQL migration/import must still be run on Railway.
- Do not launch until the media migration and Railway build pass.

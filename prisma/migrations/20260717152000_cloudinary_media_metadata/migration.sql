-- Cloudinary metadata for persistent uploaded media.
-- All fields are nullable/defaulted so existing catalog records remain intact.

ALTER TABLE "User" ADD COLUMN "profilePhotoPublicId" TEXT;

ALTER TABLE "Store" ADD COLUMN "logoPublicId" TEXT;
ALTER TABLE "Store" ADD COLUMN "coverPublicId" TEXT;

ALTER TABLE "StoreType" ADD COLUMN "iconPublicId" TEXT;
ALTER TABLE "StoreType" ADD COLUMN "imagePublicId" TEXT;

ALTER TABLE "RestaurantCategory" ADD COLUMN "imagePublicId" TEXT;

ALTER TABLE "RestaurantProduct" ADD COLUMN "imagePublicId" TEXT;

ALTER TABLE "MarketplaceProduct" ADD COLUMN "imagePublicId" TEXT;

ALTER TABLE "Product" ADD COLUMN "imagePublicId" TEXT;

ALTER TABLE "ParcelMedia" ADD COLUMN "url" TEXT;
ALTER TABLE "ParcelMedia" ADD COLUMN "publicId" TEXT;
ALTER TABLE "ParcelMedia" ADD COLUMN "resourceType" TEXT NOT NULL DEFAULT 'image';
ALTER TABLE "ParcelMedia" ADD COLUMN "width" INTEGER;
ALTER TABLE "ParcelMedia" ADD COLUMN "height" INTEGER;
ALTER TABLE "ParcelMedia" ADD COLUMN "format" TEXT;

CREATE INDEX "ParcelMedia_publicId_idx" ON "ParcelMedia"("publicId");

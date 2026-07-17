import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { uploadImageToCloudinary } from "../src/lib/cloudinary";

const db = new PrismaClient();
const CONFIRMATION = "MIGRATE_KARAME_LOCAL_IMAGES_TO_CLOUDINARY";

type ImageRecord = {
  label: string;
  value: string | null;
  purpose: string;
  update: (upload: Awaited<ReturnType<typeof uploadImageToCloudinary>>) => Promise<unknown>;
  localPath: (value: string) => string;
};

function isLocalUpload(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function localPath(value: string) {
  const relative = value.replace(/^\/+/, "").replaceAll("/", path.sep);
  const resolved = path.resolve(process.cwd(), "public", relative.replace(/^uploads[\\/]/, `uploads${path.sep}`));
  const uploadRoot = path.resolve(process.cwd(), "public", "uploads");
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error(`Unsafe local image path: ${value}`);
  }
  return resolved;
}

function parcelMediaPath(value: string) {
  const relative = value.replaceAll("/", path.sep);
  const resolved = path.resolve(process.cwd(), "storage", "parcel-media", relative);
  const root = path.resolve(process.cwd(), "storage", "parcel-media");
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe parcel media path: ${value}`);
  }
  return resolved;
}

async function collectImages(): Promise<ImageRecord[]> {
  const records: ImageRecord[] = [];
  const stores = await db.store.findMany({
    select: { id: true, name: true, logoUrl: true, coverUrl: true },
  });
  for (const store of stores) {
    records.push({
      label: `Store logo: ${store.name}`,
      value: store.logoUrl,
      purpose: "store-logo",
      localPath,
      update: (upload) => db.store.update({ where: { id: store.id }, data: { logoUrl: upload.url, logoPublicId: upload.publicId } }),
    });
    records.push({
      label: `Store cover: ${store.name}`,
      value: store.coverUrl,
      purpose: "store-cover",
      localPath,
      update: (upload) => db.store.update({ where: { id: store.id }, data: { coverUrl: upload.url, coverPublicId: upload.publicId } }),
    });
  }

  const storeTypes = await db.storeType.findMany({
    select: { id: true, name: true, iconUrl: true, imageUrl: true },
  });
  for (const type of storeTypes) {
    records.push({
      label: `Store type icon: ${type.name}`,
      value: type.iconUrl,
      purpose: "store-type",
      localPath,
      update: (upload) => db.storeType.update({ where: { id: type.id }, data: { iconUrl: upload.url, iconPublicId: upload.publicId } }),
    });
    records.push({
      label: `Store type image: ${type.name}`,
      value: type.imageUrl,
      purpose: "store-type",
      localPath,
      update: (upload) => db.storeType.update({ where: { id: type.id }, data: { imageUrl: upload.url, imagePublicId: upload.publicId } }),
    });
  }

  const restaurantCategories = await db.restaurantCategory.findMany({
    select: { id: true, name: true, imageUrl: true },
  });
  for (const category of restaurantCategories) {
    records.push({
      label: `Restaurant category: ${category.name}`,
      value: category.imageUrl,
      purpose: "category",
      localPath,
      update: (upload) => db.restaurantCategory.update({ where: { id: category.id }, data: { imageUrl: upload.url, imagePublicId: upload.publicId } }),
    });
  }

  const restaurantProducts = await db.restaurantProduct.findMany({
    select: { id: true, name: true, imageUrl: true },
  });
  for (const product of restaurantProducts) {
    records.push({
      label: `Restaurant product: ${product.name}`,
      value: product.imageUrl,
      purpose: "product",
      localPath,
      update: (upload) => db.restaurantProduct.update({ where: { id: product.id }, data: { imageUrl: upload.url, imagePublicId: upload.publicId } }),
    });
  }

  const marketplaceProducts = await db.marketplaceProduct.findMany({
    select: { id: true, name: true, imageUrl: true },
  });
  for (const product of marketplaceProducts) {
    records.push({
      label: `Marketplace product: ${product.name}`,
      value: product.imageUrl,
      purpose: "product",
      localPath,
      update: (upload) => db.marketplaceProduct.update({ where: { id: product.id }, data: { imageUrl: upload.url, imagePublicId: upload.publicId } }),
    });
  }

  const legacyProducts = await db.product.findMany({
    select: { id: true, name: true, imageUrl: true },
  });
  for (const product of legacyProducts) {
    records.push({
      label: `Legacy product: ${product.name}`,
      value: product.imageUrl,
      purpose: "product",
      localPath,
      update: (upload) => db.product.update({ where: { id: product.id }, data: { imageUrl: upload.url, imagePublicId: upload.publicId } }),
    });
  }

  const parcelMedia = await db.parcelMedia.findMany({
    where: { url: null },
    select: { id: true, kind: true, storageKey: true, originalName: true },
  });
  for (const media of parcelMedia) {
    records.push({
      label: `Parcel media: ${media.kind} ${media.originalName ?? media.id}`,
      value: media.storageKey,
      purpose: `parcel-proofs/${media.kind.toLowerCase().replaceAll("_photo", "")}`,
      localPath: parcelMediaPath,
      update: (upload) => db.parcelMedia.update({
        where: { id: media.id },
        data: {
          storageKey: upload.publicId,
          url: upload.url,
          publicId: upload.publicId,
          resourceType: upload.resourceType,
          sizeBytes: upload.bytes ?? undefined,
          width: upload.width ?? null,
          height: upload.height ?? null,
          format: upload.format ?? null,
        },
      }),
    });
  }

  return records.filter((record) => isLocalUpload(record.value) || (record.label.startsWith("Parcel media:") && Boolean(record.value)));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const confirmed = process.env.CLOUDINARY_MIGRATION_CONFIRM === CONFIRMATION;
  const records = await collectImages();
  console.log(`Local image references found: ${records.length}`);
  for (const record of records) {
    console.log(`- ${record.label}: ${record.value}`);
  }
  if (dryRun) {
    console.log("Dry run only. No files were uploaded and no database rows were changed.");
    return;
  }
  if (!confirmed) {
    throw new Error(
      `Set CLOUDINARY_MIGRATION_CONFIRM=${CONFIRMATION} to run this migration.`,
    );
  }
  let migrated = 0;
  let missing = 0;
  let failed = 0;
  for (const record of records) {
    if (!record.value) continue;
    try {
      const bytes = await readFile(record.localPath(record.value));
      const filename = path.basename(record.value);
      const uploaded = await uploadImageToCloudinary(bytes, filename, record.purpose);
      await record.update(uploaded);
      migrated++;
      console.log(`Migrated ${migrated}/${records.length}: ${record.label}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/ENOENT|no such file/i.test(message)) missing++;
      else failed++;
      console.error(`Failed: ${record.label}: ${message}`);
    }
  }
  console.log(`Cloudinary media migration completed. Migrated: ${migrated}. Missing: ${missing}. Failed: ${failed}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { uploadImageToCloudinary } from "@/lib/cloudinary";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const purposes = new Set([
  "store-logo",
  "store-cover",
  "store-type",
  "product",
]);

function detectImageExtension(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export async function uploadCatalogImage(request: Request, partnerId?: string) {
  const formData = await request.formData().catch(() => null);
  if (!formData)
    return NextResponse.json(
      { error: "Choose a valid image upload." },
      { status: 400 },
    );
  const file = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "");

  if (
    !(file instanceof File) ||
    !(partnerId ? purpose === "product" : purposes.has(purpose))
  ) {
    return NextResponse.json(
      { error: "Choose a valid image and upload destination." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "The image must be smaller than 8 MB." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectImageExtension(bytes);
  if (!extension) {
    return NextResponse.json(
      { error: "Only valid JPG, PNG, and WebP images are allowed." },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;
  let uploaded;
  try {
    uploaded = await uploadImageToCloudinary(
      bytes,
      filename,
      partnerId ? `partners/${partnerId}/${purpose}` : purpose,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cloudinary upload failed.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { url: uploaded.url, publicId: uploaded.publicId },
    { status: 201 },
  );
}

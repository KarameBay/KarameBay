import { randomUUID } from "crypto";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MEDIA_KINDS = new Set(["parcel", "pickup", "delivery"]);

function detectImage(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { extension: "jpg", contentType: "image/jpeg" };
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return { extension: "png", contentType: "image/png" };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return { extension: "webp", contentType: "image/webp" };
  return null;
}

export async function saveParcelMedia(file: File, kind: "parcel" | "pickup" | "delivery") {
  if (!MEDIA_KINDS.has(kind)) throw new Error("Invalid parcel media type.");
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    throw new Error("Parcel photos must be valid images smaller than 6 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectImage(bytes);
  if (!image) throw new Error("Only valid JPG, PNG, and WebP images are allowed.");
  const filename = `${randomUUID()}.${image.extension}`;
  const uploaded = await uploadImageToCloudinary(bytes, filename, `parcel-proofs/${kind}`);
  return {
    storageKey: uploaded.publicId,
    url: uploaded.url,
    publicId: uploaded.publicId,
    resourceType: uploaded.resourceType,
    contentType: image.contentType,
    sizeBytes: file.size,
    width: uploaded.width,
    height: uploaded.height,
    format: uploaded.format,
  };
}

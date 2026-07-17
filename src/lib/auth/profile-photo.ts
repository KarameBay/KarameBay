import { randomUUID } from "node:crypto";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

function imageExtension(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}

export async function saveProfilePhoto(file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_PROFILE_IMAGE_BYTES)
    throw new Error("Profile photo must be smaller than 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = imageExtension(bytes);
  if (!extension) throw new Error("Profile photo must be a valid JPG, PNG, or WebP image.");
  const filename = `${randomUUID()}.${extension}`;
  const uploaded = await uploadImageToCloudinary(bytes, filename, "profiles");
  return { url: uploaded.url, publicId: uploaded.publicId };
}

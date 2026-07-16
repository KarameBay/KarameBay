import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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

function mediaRoot() {
  return path.resolve(process.cwd(), "storage", "parcel-media");
}

export async function saveParcelMedia(file: File, kind: "parcel" | "pickup" | "delivery") {
  if (!MEDIA_KINDS.has(kind)) throw new Error("Invalid parcel media type.");
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    throw new Error("Parcel photos must be valid images smaller than 6 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectImage(bytes);
  if (!image) throw new Error("Only valid JPG, PNG, and WebP images are allowed.");
  const directory = path.join(mediaRoot(), kind);
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${image.extension}`;
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  return {
    storageKey: `${kind}/${filename}`,
    contentType: image.contentType,
    sizeBytes: file.size,
  };
}

export async function readParcelMedia(storageKey: string) {
  const root = mediaRoot();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid parcel media path.");
  const data = await readFile(resolved);
  const image = detectImage(data);
  if (!image) throw new Error("Invalid parcel media file.");
  return { data, contentType: image.contentType };
}


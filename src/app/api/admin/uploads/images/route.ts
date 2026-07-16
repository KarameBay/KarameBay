import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const purposes = new Set(["store-logo", "store-cover", "product"]);

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

export async function POST(request: Request) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin) {
    return NextResponse.json({ error: "Sign in as Admin to upload images." }, { status: 401 });
  }
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Only Admin can upload catalog images." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "");

  if (!(file instanceof File) || !purposes.has(purpose)) {
    return NextResponse.json({ error: "Choose a valid image and upload destination." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "The image must be smaller than 8 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectImageExtension(bytes);
  if (!extension) {
    return NextResponse.json({ error: "Only valid JPG, PNG, and WebP images are allowed." }, { status: 400 });
  }

  const uploadRoot = path.join(process.cwd(), "public", "uploads");
  const destination = path.resolve(uploadRoot, purpose);
  if (!destination.startsWith(path.resolve(uploadRoot) + path.sep)) {
    return NextResponse.json({ error: "Invalid upload destination." }, { status: 400 });
  }

  await mkdir(destination, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(destination, filename), bytes, { flag: "wx" });

  return NextResponse.json(
    { url: `/uploads/${purpose}/${filename}` },
    { status: 201 },
  );
}

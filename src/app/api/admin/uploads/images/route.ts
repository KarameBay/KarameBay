import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { uploadCatalogImage } from "@/lib/catalog-image-upload";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json(
      { error: "Sign in as Admin to upload images." },
      { status: 401 },
    );
  return uploadCatalogImage(request);
}

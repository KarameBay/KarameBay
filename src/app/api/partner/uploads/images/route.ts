import { NextResponse } from "next/server";
import { getVerifiedPartner } from "@/lib/partner";
import { uploadCatalogImage } from "@/lib/catalog-image-upload";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const partner = await getVerifiedPartner();
  if (!partner)
    return NextResponse.json(
      { error: "Sign in with a verified partner account." },
      { status: 401 },
    );
  if (!rateLimit(`partner-upload:${partner.id}`, 30, 60 * 60_000))
    return NextResponse.json(
      { error: "Upload limit reached. Try again later." },
      { status: 429 },
    );
  return uploadCatalogImage(request, partner.id);
}

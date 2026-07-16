import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parcelRiderMaySeeContacts } from "@/lib/parcel";
import { readParcelMedia } from "@/lib/parcel-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser("ADMIN");
  const rider = await getCurrentUser("RIDER");
  const customer = await getCurrentUser("CUSTOMER");
  const user = admin ?? rider ?? customer;
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const media = await db.parcelMedia.findUnique({
    where: { id },
    include: { parcelDelivery: { select: { customerId: true, assignedRiderId: true, status: true } } },
  });
  if (!media) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  const allowed =
    user.role === "ADMIN" ||
    (user.role === "CUSTOMER" && media.parcelDelivery.customerId === user.id) ||
    (user.role === "RIDER" && media.parcelDelivery.assignedRiderId === user.id && parcelRiderMaySeeContacts(media.parcelDelivery.status));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const file = await readParcelMedia(media.storageKey);
    return new Response(file.data, {
      headers: {
        "content-type": file.contentType,
        "cache-control": "private, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image is unavailable." }, { status: 404 });
  }
}


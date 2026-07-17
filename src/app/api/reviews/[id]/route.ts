import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { refreshRatingSummaries } from "@/lib/reviews";

const optionalRating = z.number().int().min(1).max(5).nullable().optional();
const schema = z.object({
  storeRating: z.number().int().min(1).max(5),
  writtenReview: z.string().trim().max(1500).optional(),
  foodQualityRating: optionalRating,
  packagingRating: optionalRating,
  orderAccuracyRating: optionalRating,
  riderOverallRating: optionalRating,
  friendlinessRating: optionalRating,
  deliverySpeedRating: optionalRating,
  professionalismRating: optionalRating,
  riderComment: z.string().trim().max(1500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentUser("CUSTOMER");
  if (!customer || customer.role !== "CUSTOMER")
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Review the rating fields and try again." }, { status: 400 });
  const { id } = await params;
  const existing = await db.review.findFirst({ where: { id, customerId: customer.id } });
  if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (existing.editableUntil <= new Date())
    return NextResponse.json({ error: "The 24-hour editing window has ended." }, { status: 409 });
  await db.review.update({
    where: { id },
    data: { ...parsed.data, writtenReview: parsed.data.writtenReview || null, riderComment: parsed.data.riderComment || null },
  });
  await refreshRatingSummaries(existing.storeId, existing.riderId);
  return NextResponse.json({ ok: true });
}

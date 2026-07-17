import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { refreshRatingSummaries, REVIEW_EDIT_WINDOW_MS } from "@/lib/reviews";

const optionalRating = z.number().int().min(1).max(5).nullable().optional();
const schema = z.object({
  orderNumber: z.string().trim().min(1),
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

export async function POST(request: Request) {
  const customer = await getCurrentUser("CUSTOMER");
  if (!customer || customer.role !== "CUSTOMER")
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Review the rating fields and try again." }, { status: 400 });
  const order = await db.order.findFirst({
    where: { orderNumber: parsed.data.orderNumber, customerId: customer.id },
    select: { id: true, status: true, storeId: true, riderId: true, review: { select: { id: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "DELIVERED")
    return NextResponse.json({ error: "Only delivered orders can be reviewed." }, { status: 409 });
  if (order.review)
    return NextResponse.json({ error: "This order has already been reviewed." }, { status: 409 });
  const now = new Date();
  const reviewData = {
    storeRating: parsed.data.storeRating,
    writtenReview: parsed.data.writtenReview,
    foodQualityRating: parsed.data.foodQualityRating,
    packagingRating: parsed.data.packagingRating,
    orderAccuracyRating: parsed.data.orderAccuracyRating,
    riderOverallRating: parsed.data.riderOverallRating,
    friendlinessRating: parsed.data.friendlinessRating,
    deliverySpeedRating: parsed.data.deliverySpeedRating,
    professionalismRating: parsed.data.professionalismRating,
    riderComment: parsed.data.riderComment,
  };
  const review = await db.review.create({
    data: {
      orderId: order.id,
      customerId: customer.id,
      storeId: order.storeId,
      riderId: order.riderId,
      ...reviewData,
      writtenReview: parsed.data.writtenReview || null,
      riderComment: parsed.data.riderComment || null,
      editableUntil: new Date(now.getTime() + REVIEW_EDIT_WINDOW_MS),
    },
  });
  await refreshRatingSummaries(order.storeId, order.riderId);
  return NextResponse.json({ ok: true, reviewId: review.id }, { status: 201 });
}

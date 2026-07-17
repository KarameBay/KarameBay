import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { refreshRatingSummaries } from "@/lib/reviews";

const schema = z.object({
  action: z.enum(["SHOW", "HIDE", "REPORT", "REPLY"]),
  reason: z.string().trim().max(500).optional(),
  reply: z.string().trim().max(1500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 });
  const { id } = await params;
  const review = await db.review.findUnique({ where: { id }, select: { storeId: true, riderId: true } });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  const now = new Date();
  if (parsed.data.action === "REPLY") {
    if (!parsed.data.reply) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
    await db.review.update({ where: { id }, data: { adminReply: parsed.data.reply, adminRepliedAt: now, moderatedById: admin.id } });
  } else {
    const moderationStatus = parsed.data.action === "SHOW" ? "VISIBLE" : parsed.data.action === "HIDE" ? "HIDDEN" : "REPORTED";
    await db.review.update({ where: { id }, data: { moderationStatus, moderationReason: parsed.data.reason || null, moderatedById: admin.id, moderatedAt: now } });
  }
  await refreshRatingSummaries(review.storeId, review.riderId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { id } = await params;
  const review = await db.review.findUnique({ where: { id }, select: { storeId: true, riderId: true } });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  await db.review.delete({ where: { id } });
  await refreshRatingSummaries(review.storeId, review.riderId);
  return NextResponse.json({ ok: true });
}

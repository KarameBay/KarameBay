import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { EMAIL_CODE_RESEND_COOLDOWN_MS, issueEmailVerificationCode } from "@/lib/auth/email-verification";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user || user.role !== "CUSTOMER")
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (user.emailVerifiedAt) return NextResponse.json({ verified: true });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`resend-email:ip:${ip}`, 8, 10 * 60_000) || !rateLimit(`resend-email:user:${user.id}`, 4, 10 * 60_000))
    return NextResponse.json({ error: "Too many resend requests. Try again later." }, { status: 429 });
  const existing = await db.emailVerificationChallenge.findUnique({ where: { userId: user.id }, select: { lastSentAt: true } });
  const elapsed = existing ? Date.now() - existing.lastSentAt.getTime() : Infinity;
  if (elapsed < EMAIL_CODE_RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((EMAIL_CODE_RESEND_COOLDOWN_MS - elapsed) / 1000);
    return NextResponse.json({ error: `Please wait ${retryAfter} seconds before resending.`, retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  const sent = await issueEmailVerificationCode({ userId: user.id, email: user.email, firstName: user.firstName });
  if (!sent.ok) {
    console.warn("Email verification resend failed", {
      userId: user.id,
      error: sent.error,
    });
    return NextResponse.json({ error: "The email could not be sent. Please try again shortly." }, { status: 503 });
  }
  return NextResponse.json({ sent: true, cooldownSeconds: 60 });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyEmailCode } from "@/lib/auth/email-verification";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

export async function POST(request: NextRequest) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user || user.role !== "CUSTOMER")
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (user.emailVerifiedAt)
    return NextResponse.json({ verified: true, redirectTo: "/customer/account" });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`verify-email:ip:${ip}`, 20, 10 * 60_000) || !rateLimit(`verify-email:user:${user.id}`, 8, 10 * 60_000))
    return NextResponse.json({ error: "Too many verification attempts. Request a new code later." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  const result = await verifyEmailCode(user.id, parsed.data.code);
  if (result.ok)
    return NextResponse.json({ verified: true, redirectTo: "/customer/account" });
  const messages = {
    missing: "No active code was found. Request a new code.",
    expired: "This code has expired. Request a new code.",
    locked: "Too many incorrect attempts. Request a new code.",
    incorrect: "That verification code is incorrect.",
  } as const;
  return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
}

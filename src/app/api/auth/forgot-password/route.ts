import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/auth/validation";
import { issuePasswordResetCode } from "@/lib/auth/password-reset";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GENERIC_MESSAGE =
  "If a customer account matches that email, a password reset code has been sent.";

function rateKey(email: string) {
  const secret = process.env.AUTH_SECRET ?? "karame-password-reset-rate-key";
  return createHmac("sha256", secret).update(email).digest("hex");
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (
    !rateLimit(`password-reset:request:ip:${ip}`, 5, 10 * 60_000) ||
    !rateLimit(`password-reset:request:email:${rateKey(parsed.data.email)}`, 4, 10 * 60_000)
  )
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      { status: 429 },
    );

  const customer = await db.user.findFirst({
    where: {
      email: parsed.data.email,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
    select: { id: true, email: true, firstName: true },
  });
  if (customer) {
    // Keep this response indistinguishable from an unknown address even when
    // SMTP is temporarily unavailable. Delivery failures belong in private
    // operational monitoring, never in this public response.
    try {
      await issuePasswordResetCode({
        userId: customer.id,
        email: customer.email,
        firstName: customer.firstName,
      });
    } catch {
      // Intentionally return the same generic response below.
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}

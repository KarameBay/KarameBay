import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCustomerPasswordResetCode } from "@/lib/auth/password-reset";
import { verifyResetCodeSchema } from "@/lib/auth/validation";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const INVALID_CODE_MESSAGE = "The code is invalid or expired.";

function rateKey(email: string) {
  const secret = process.env.AUTH_SECRET ?? "karame-password-reset-rate-key";
  return createHmac("sha256", secret).update(email).digest("hex");
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  const parsed = verifyResetCodeSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (
    !rateLimit(`password-reset:code-check:ip:${ip}`, 12, 10 * 60_000) ||
    !rateLimit(
      `password-reset:code-check:email:${rateKey(parsed.data.email)}`,
      7,
      10 * 60_000,
    )
  )
    return NextResponse.json(
      { error: "Too many code attempts. Request a new code later." },
      { status: 429 },
    );

  const customer = await db.user.findFirst({
    where: {
      email: parsed.data.email,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!customer)
    return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });

  const result = await verifyCustomerPasswordResetCode({
    userId: customer.id,
    code: parsed.data.code,
  });
  if (!result.ok)
    return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });

  return NextResponse.json({
    verified: true,
    message: "Code verified. You can now create a new password.",
  });
}

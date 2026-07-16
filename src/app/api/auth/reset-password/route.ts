import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/auth/validation";
import { resetCustomerPassword } from "@/lib/auth/password-reset";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function rateKey(email: string) {
  const secret = process.env.AUTH_SECRET ?? "karame-password-reset-rate-key";
  return createHmac("sha256", secret).update(email).digest("hex");
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Check the submitted details." },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (
    !rateLimit(`password-reset:verify:ip:${ip}`, 12, 10 * 60_000) ||
    !rateLimit(`password-reset:verify:email:${rateKey(parsed.data.email)}`, 7, 10 * 60_000)
  )
    return NextResponse.json(
      { error: "Too many reset attempts. Request a new code later." },
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
    return NextResponse.json(
      { error: "The code is invalid or expired." },
      { status: 400 },
    );

  const result = await resetCustomerPassword({
    userId: customer.id,
    code: parsed.data.code,
    password: parsed.data.password,
  });
  if (!result.ok)
    return NextResponse.json(
      { error: "The code is invalid or expired." },
      { status: 400 },
    );

  return NextResponse.json({
    message: "Your password has been reset. Sign in with your new password.",
    redirectTo: "/customer/login",
  });
}

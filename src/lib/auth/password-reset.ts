import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { sendSmtpMail } from "@/lib/smtp";
import { PASSWORD_HASH_ROUNDS } from "@/lib/auth/constants";

export const PASSWORD_RESET_CODE_TTL_MS = 10 * 60_000;
export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60_000;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

function resetSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return secret;
}

function hashCode(userId: string, code: string) {
  return createHmac("sha256", resetSecret())
    .update(`password-reset:${userId}:${code}`)
    .digest("hex");
}

function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function issuePasswordResetCode(input: {
  userId: string;
  email: string;
  firstName: string;
}) {
  const existing = await db.passwordResetChallenge.findUnique({
    where: { userId: input.userId },
    select: { lastSentAt: true },
  });
  const now = new Date();
  if (
    existing &&
    now.getTime() - existing.lastSentAt.getTime() <
      PASSWORD_RESET_RESEND_COOLDOWN_MS
  ) {
    return { ok: true as const, sent: false as const, reason: "cooldown" as const };
  }

  const code = generateCode();
  await db.passwordResetChallenge.upsert({
    where: { userId: input.userId },
    update: {
      codeHash: hashCode(input.userId, code),
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS),
      attemptCount: 0,
      maxAttempts: PASSWORD_RESET_MAX_ATTEMPTS,
      lastSentAt: now,
    },
    create: {
      userId: input.userId,
      codeHash: hashCode(input.userId, code),
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS),
      maxAttempts: PASSWORD_RESET_MAX_ATTEMPTS,
      lastSentAt: now,
    },
  });

  const delivery = await sendSmtpMail({
    to: input.email,
    subject: "Reset Your Karame Bay Password",
    text: [
      `Hello ${input.firstName},`,
      "",
      "We received a request to reset your Karame Bay customer password.",
      `Your password reset code is: ${code}`,
      "",
      "This code expires in 10 minutes.",
      "Do not share this code with anyone. Karame Bay staff will never ask for it.",
      "If you did not request this reset, you can safely ignore this email.",
      "",
      "Karame Bay",
      "Kigali, delivered.",
    ].join("\n"),
  });

  return {
    ok: delivery.ok,
    sent: delivery.ok,
    reason: delivery.ok ? undefined : "delivery-failed",
  } as const;
}

/**
 * Checks a reset code without consuming it. This supports a separate code
 * confirmation screen, while resetCustomerPassword still repeats the same
 * server-side check immediately before changing the password.
 */
export async function verifyCustomerPasswordResetCode(input: {
  userId: string;
  code: string;
}) {
  const challenge = await db.passwordResetChallenge.findUnique({
    where: { userId: input.userId },
  });
  if (!challenge) return { ok: false as const, reason: "invalid" as const };
  if (challenge.expiresAt <= new Date()) {
    await db.passwordResetChallenge.deleteMany({ where: { userId: input.userId } });
    return { ok: false as const, reason: "invalid" as const };
  }
  if (challenge.attemptCount >= challenge.maxAttempts)
    return { ok: false as const, reason: "invalid" as const };

  const received = Buffer.from(hashCode(input.userId, input.code), "hex");
  const expected = Buffer.from(challenge.codeHash, "hex");
  const correct =
    received.length === expected.length && timingSafeEqual(received, expected);
  if (!correct) {
    await db.passwordResetChallenge.update({
      where: { userId: input.userId },
      data: { attemptCount: { increment: 1 } },
    });
    return { ok: false as const, reason: "invalid" as const };
  }

  return { ok: true as const };
}

export async function resetCustomerPassword(input: {
  userId: string;
  code: string;
  password: string;
}) {
  const verification = await verifyCustomerPasswordResetCode({
    userId: input.userId,
    code: input.code,
  });
  if (!verification.ok) return verification;

  const passwordHash = await hash(input.password, PASSWORD_HASH_ROUNDS);
  await db.$transaction([
    db.user.update({
      where: { id: input.userId },
      data: { passwordHash },
    }),
    db.passwordResetChallenge.delete({ where: { userId: input.userId } }),
    db.session.deleteMany({ where: { userId: input.userId } }),
  ]);
  return { ok: true as const };
}

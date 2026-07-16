import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendSmtpMail } from "@/lib/smtp";

export const EMAIL_CODE_TTL_MS = 10 * 60_000;
export const EMAIL_CODE_RESEND_COOLDOWN_MS = 60_000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;

function verificationSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return secret;
}

function hashCode(userId: string, code: string) {
  return createHmac("sha256", verificationSecret())
    .update(`${userId}:${code}`)
    .digest("hex");
}

function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function issueEmailVerificationCode(input: {
  userId: string;
  email: string;
  firstName: string;
}) {
  const code = generateCode();
  const now = new Date();
  await db.emailVerificationChallenge.upsert({
    where: { userId: input.userId },
    update: {
      codeHash: hashCode(input.userId, code),
      expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
      attemptCount: 0,
      maxAttempts: EMAIL_CODE_MAX_ATTEMPTS,
      lastSentAt: now,
    },
    create: {
      userId: input.userId,
      codeHash: hashCode(input.userId, code),
      expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
      maxAttempts: EMAIL_CODE_MAX_ATTEMPTS,
      lastSentAt: now,
    },
  });

  return sendSmtpMail({
    to: input.email,
    subject: "Verify Your Karame Bay Email",
    text: [
      `Hello ${input.firstName},`,
      "",
      "Welcome to Karame Bay.",
      `Your email verification code is: ${code}`,
      "",
      "This code expires in 10 minutes.",
      "Do not share this code with anyone. Karame Bay staff will never ask for it.",
      "",
      "Karame Bay",
      "Kigali, delivered.",
    ].join("\n"),
  });
}

export async function verifyEmailCode(userId: string, code: string) {
  const challenge = await db.emailVerificationChallenge.findUnique({
    where: { userId },
  });
  if (!challenge) return { ok: false as const, reason: "missing" as const };
  if (challenge.expiresAt <= new Date())
    return { ok: false as const, reason: "expired" as const };
  if (challenge.attemptCount >= challenge.maxAttempts)
    return { ok: false as const, reason: "locked" as const };

  const received = Buffer.from(hashCode(userId, code), "hex");
  const expected = Buffer.from(challenge.codeHash, "hex");
  const correct =
    received.length === expected.length && timingSafeEqual(received, expected);
  if (!correct) {
    await db.emailVerificationChallenge.update({
      where: { userId },
      data: { attemptCount: { increment: 1 } },
    });
    return { ok: false as const, reason: "incorrect" as const };
  }

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationChallenge.delete({ where: { userId } }),
  ]);
  return { ok: true as const };
}

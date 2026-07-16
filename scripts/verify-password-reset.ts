import "dotenv/config";
import { createHmac } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  resetCustomerPassword,
  verifyCustomerPasswordResetCode,
} from "../src/lib/auth/password-reset";

const db = new PrismaClient();
const secret = process.env.AUTH_SECRET ?? "";
const baseUrl = process.env.TEST_BASE_URL?.replace(/\/$/, "");

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function codeHash(userId: string, code: string) {
  return createHmac("sha256", secret)
    .update(`password-reset:${userId}:${code}`)
    .digest("hex");
}

async function post(path: string, body: Record<string, string>) {
  check(baseUrl, "TEST_BASE_URL must be configured for an HTTP test.");
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  check(secret.length >= 32, "AUTH_SECRET must be configured.");
  const stamp = String(Date.now());
  const email = `password-reset-test-${stamp}@example.com`;
  const phone = `+25072${stamp.slice(-7)}`;
  const user = await db.user.create({
    data: {
      email,
      phone,
      firstName: "Password",
      lastName: "Reset Test",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      passwordHash: await hash("OldPassword1", 4),
      sessions: {
        create: {
          id: `reset-test-${stamp}`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      },
    },
  });

  try {
    const code = "482731";
    await db.passwordResetChallenge.create({
      data: {
        userId: user.id,
        codeHash: codeHash(user.id, code),
        expiresAt: new Date(Date.now() - 1),
      },
    });
    const expired = await resetCustomerPassword({
      userId: user.id,
      code,
      password: "NewPassword2",
    });
    check(!expired.ok, "An expired reset code was accepted.");

    await db.passwordResetChallenge.create({
      data: {
        userId: user.id,
        codeHash: codeHash(user.id, code),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    const incorrectRejected = baseUrl
      ? (await post("/api/auth/verify-reset-code", { email, code: "000000" }))
          .status === 400
      : !(
          await verifyCustomerPasswordResetCode({
            userId: user.id,
            code: "000000",
          })
        ).ok;
    check(
      incorrectRejected,
      "An incorrect code passed the verification step.",
    );
    const attempted = await db.passwordResetChallenge.findUniqueOrThrow({
      where: { userId: user.id },
    });
    check(attempted.attemptCount === 1, "Incorrect attempt was not counted.");

    const verifiedAccepted = baseUrl
      ? (await post("/api/auth/verify-reset-code", { email, code })).status === 200
      : (await verifyCustomerPasswordResetCode({ userId: user.id, code })).ok;
    check(
      verifiedAccepted,
      "A valid code failed the verification step.",
    );
    check(
      Boolean(
        await db.passwordResetChallenge.findUnique({ where: { userId: user.id } }),
      ),
      "Code verification consumed the challenge before password reset.",
    );

    const resetAccepted = baseUrl
      ? (
          await post("/api/auth/reset-password", {
            email,
            code,
            password: "NewPassword2",
            confirmPassword: "NewPassword2",
          })
        ).status === 200
      : (
          await resetCustomerPassword({
            userId: user.id,
            code,
            password: "NewPassword2",
          })
        ).ok;
    check(
      resetAccepted,
      "A valid reset code was rejected.",
    );
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    check(
      await compare("NewPassword2", updated.passwordHash),
      "The new password was not saved.",
    );
    check(
      (await db.session.count({ where: { userId: user.id } })) === 0,
      "Existing sessions were not revoked.",
    );
    check(
      !(await db.passwordResetChallenge.findUnique({ where: { userId: user.id } })),
      "The reset code was not invalidated after use.",
    );
    console.log(
      "Password reset expiry, staged code verification, update, and session revocation passed.",
    );
  } finally {
    await db.user.deleteMany({ where: { id: user.id } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

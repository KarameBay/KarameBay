import "dotenv/config";
import { createHmac } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { normalizeRwandaPhone } from "../src/lib/auth/phone";
import { verifyEmailCode } from "../src/lib/auth/email-verification";

const db = new PrismaClient();
const secret = process.env.AUTH_SECRET ?? "";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function codeHash(userId: string, code: string) {
  return createHmac("sha256", secret).update(`${userId}:${code}`).digest("hex");
}

async function main() {
  assert(secret.length >= 32, "AUTH_SECRET must be configured for this test.");
  assert(normalizeRwandaPhone("0788123456") === "+250788123456", "Local phone normalization failed.");
  assert(normalizeRwandaPhone("250788123456") === "+250788123456", "Country-code phone normalization failed.");
  assert(normalizeRwandaPhone("+250788123456") === "+250788123456", "International phone normalization failed.");
  assert(normalizeRwandaPhone("078812345") === null, "Invalid phone length was accepted.");

  const email = `verification-test-${Date.now()}@example.com`;
  const phone = `+25079${String(Date.now()).slice(-7)}`;
  const user = await db.user.create({
    data: {
      email,
      phone,
      firstName: "Verification",
      lastName: "Test",
      role: "CUSTOMER",
      status: "ACTIVE",
      passwordHash: await hash("Karame@Test1", 4),
      emailVerifiedAt: null,
    },
  });
  try {
    await db.emailVerificationChallenge.create({
      data: {
        userId: user.id,
        codeHash: codeHash(user.id, "123456"),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    const incorrect = await verifyEmailCode(user.id, "654321");
    assert(!incorrect.ok && incorrect.reason === "incorrect", "Incorrect code was not rejected.");
    const challenge = await db.emailVerificationChallenge.findUniqueOrThrow({ where: { userId: user.id } });
    assert(challenge.attemptCount === 1, "Incorrect attempt was not counted.");

    await db.emailVerificationChallenge.update({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    const expired = await verifyEmailCode(user.id, "123456");
    assert(!expired.ok && expired.reason === "expired", "Expired code was not rejected.");

    await db.emailVerificationChallenge.update({
      where: { userId: user.id },
      data: { codeHash: codeHash(user.id, "123456"), expiresAt: new Date(Date.now() + 10 * 60_000), attemptCount: 0 },
    });
    const correct = await verifyEmailCode(user.id, "123456");
    assert(correct.ok, "Correct code was rejected.");
    const verified = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert(Boolean(verified.emailVerifiedAt), "Customer was not marked verified.");
    console.log("Customer phone normalization and email verification tests passed.");
  } finally {
    await db.user.deleteMany({ where: { id: user.id } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());

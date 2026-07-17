import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PASSWORD_HASH_ROUNDS } from "../src/lib/auth/constants";

const db = new PrismaClient();
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const marker = `temporary-role-check-${Date.now()}`;
const password = randomBytes(24).toString("base64url");
let requestSequence = 80;
const accounts = [
  { role: "CUSTOMER", portal: "customer", cookie: "karame_customer_session" },
  { role: "ADMIN", portal: "admin", cookie: "karame_admin_session" },
  { role: "RIDER", portal: "rider", cookie: "karame_rider_session" },
] as const;

async function login(email: string, portal: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `198.51.100.${requestSequence++}`,
    },
    body: JSON.stringify({
      email,
      password,
      audience: portal === "customer" ? "customer" : "staff",
      portal,
    }),
  });
  return {
    response,
    cookie: response.headers.get("set-cookie") ?? "",
  };
}

async function main() {
  const passwordHash = await hash(password, PASSWORD_HASH_ROUNDS);
  const created = [];
  try {
    for (const [index, account] of accounts.entries()) {
      const user = await db.user.create({
        data: {
          email: `${marker}-${account.role.toLowerCase()}@karamebay.invalid`,
          phone: `+250790${String(Date.now() + index).slice(-6)}`,
          firstName: "Temporary",
          lastName: "Role Check",
          role: account.role,
          status: "ACTIVE",
          passwordHash,
          emailVerifiedAt: account.role === "CUSTOMER" ? new Date() : null,
        },
      });
      created.push(user);
    }

    for (const account of accounts) {
      const user = created.find((candidate) => candidate.role === account.role)!;
      const result = await login(user.email, account.portal);
      if (!result.response.ok || !result.cookie.includes(`${account.cookie}=`)) {
        throw new Error(`${account.role} did not receive the correct isolated session.`);
      }
    }

    const admin = created.find((candidate) => candidate.role === "ADMIN")!;
    const rider = created.find((candidate) => candidate.role === "RIDER")!;
    const customer = created.find((candidate) => candidate.role === "CUSTOMER")!;
    for (const [email, wrongPortal] of [
      [admin.email, "rider"],
      [rider.email, "admin"],
      [customer.email, "admin"],
    ] as const) {
      const result = await login(email, wrongPortal);
      if (result.response.status !== 403) {
        throw new Error(`Cross-role login was not blocked for ${wrongPortal}.`);
      }
    }

    console.log("PASS: Customer, Admin, and Rider sessions are isolated and cross-role login is blocked.");
  } finally {
    await db.user.deleteMany({ where: { email: { startsWith: marker } } });
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

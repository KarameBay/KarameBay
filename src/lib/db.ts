import { PrismaClient } from "@prisma/client";

// Next.js imports route modules while collecting the production build. That
// phase must not require a live database connection; pages and API handlers
// remain dynamic and will validate the URL when they execute at runtime.
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL && !isNextBuild) {
  throw new Error("DATABASE_URL is required in production.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

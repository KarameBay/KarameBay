import { cache } from "react";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  LEGACY_SESSION_COOKIE,
  Role,
  SESSION_COOKIE_BY_ROLE,
  SESSION_DURATION_SECONDS,
} from "./constants";
import { signSession, verifySession } from "./token";

function shouldUseSecureCookies() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.SESSION_COOKIE_SECURE !== "false"
  );
}

export async function createSession(user: { id: string; role: string }) {
  const role = user.role as Role;
  if (!(role in SESSION_COOKIE_BY_ROLE)) {
    throw new Error("Unsupported session role");
  }
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  await db.session.create({ data: { id: jti, userId: user.id, expiresAt } });
  if (user.role === "RIDER") {
    const now = new Date();
    await db.riderProfile.upsert({
      where: { userId: user.id },
      update: {
        riderStatus: "AVAILABLE",
        onlineSinceAt: now,
        lastSeenAt: now,
      },
      create: {
        userId: user.id,
        riderStatus: "AVAILABLE",
        onlineSinceAt: now,
        lastSeenAt: now,
      },
    });
  }
  const token = await signSession({ sub: user.id, role: user.role, jti });
  const jar = await cookies();
  jar.set(SESSION_COOKIE_BY_ROLE[role], token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  // Retire the old shared cookie without touching either of the other portal
  // cookies. This is what makes simultaneous role sessions possible.
  jar.set(LEGACY_SESSION_COOKIE, "", cookieOptions(0));
}

function cookieOptions(maxAge = SESSION_DURATION_SECONDS) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function destroySession(role: Role) {
  const jar = await cookies();
  const cookieName = SESSION_COOKIE_BY_ROLE[role];
  const token = jar.get(cookieName)?.value;
  const payload = token ? await verifySession(token) : null;
  if (payload) {
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { role: true },
    });
    if (user?.role === "RIDER") {
      await db.riderProfile.upsert({
        where: { userId: payload.sub },
        update: {
          riderStatus: "OFFLINE",
          lastSeenAt: new Date(),
        },
        create: {
          userId: payload.sub,
          riderStatus: "OFFLINE",
          lastSeenAt: new Date(),
        },
      });
    }
    await db.session.deleteMany({ where: { id: payload.jti } });
  }
  jar.set(cookieName, "", cookieOptions(0));
}

async function readCurrentUser(role: Role) {
  const jar = await cookies();
  let token = jar.get(SESSION_COOKIE_BY_ROLE[role])?.value;
  // Allow an existing pre-upgrade login to work once. New logins always use
  // the isolated role cookie and remove this legacy cookie.
  token ??= jar.get(LEGACY_SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload || payload.role !== role) return null;
  const session = await db.session.findUnique({
    where: { id: payload.jti },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          profilePhotoUrl: true,
          emailVerifiedAt: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
        },
      },
    },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  )
    return null;
  return session.user;
}

export const getCurrentUser = cache(async (role?: Role) => {
  if (role) return readCurrentUser(role);
  for (const candidate of ["CUSTOMER", "ADMIN", "RIDER"] as const) {
    const user = await readCurrentUser(candidate);
    if (user) return user;
  }
  return null;
});

export async function requireRole(...allowed: Role[]) {
  let user = null;
  for (const role of allowed) {
    user = await getCurrentUser(role);
    if (user) break;
  }
  if (!user) {
    if (allowed.includes("CUSTOMER")) {
      redirect("/customer/login");
    }
    if (allowed.includes("RIDER") && !allowed.includes("ADMIN")) {
      redirect("/rider/login");
    }
    redirect("/admin/login");
  }
  if (user.role === "CUSTOMER" && !user.emailVerifiedAt)
    redirect("/customer/verify-email");
  return user;
}

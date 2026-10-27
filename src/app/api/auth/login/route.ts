import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";
import { roleLandingPath, type Role } from "@/lib/auth/constants";
import { rateLimit } from "@/lib/rate-limit";
import { partnerPortalEnabled } from "@/lib/portal-surface";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isBrowserForm =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
  const input = isBrowserForm
    ? Object.fromEntries(await request.formData())
    : await request.json().catch(() => null);
  const audience =
    input &&
    typeof input === "object" &&
    "audience" in input &&
    input.audience === "staff"
      ? "staff"
      : input &&
          typeof input === "object" &&
          "audience" in input &&
          input.audience === "partner"
        ? "partner"
        : "customer";
  const portal =
    input &&
    typeof input === "object" &&
    "portal" in input &&
    typeof input.portal === "string"
      ? input.portal
      : audience === "staff"
        ? "admin"
        : audience === "partner"
          ? "partner"
          : "customer";
  const loginPage =
    portal === "rider"
      ? "/rider/login"
      : portal === "admin"
        ? "/admin/login"
        : portal === "partner"
          ? "/partner/login"
          : "/customer/login";

  const failure = (error: string, status: number) => {
    if (isBrowserForm) {
      const url = new URL(loginPage, request.url);
      url.searchParams.set("error", error);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error }, { status });
  };

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`login:${ip}`, 8, 60_000))
    return failure("Too many attempts. Try again shortly.", 429);

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid email or password.", 401);
  if (
    (parsed.data.audience === "partner" || portal === "partner") &&
    !partnerPortalEnabled()
  )
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !(await compare(parsed.data.password, user.passwordHash)))
    return failure("Invalid email or password.", 401);
  if (user.status !== "ACTIVE")
    return failure("This account is not active.", 403);

  const isCustomer = user.role === "CUSTOMER";
  if (
    user.role !== "CUSTOMER" &&
    user.role !== "ADMIN" &&
    user.role !== "RIDER" &&
    user.role !== "PARTNER"
  )
    return failure("This account type is no longer supported.", 403);
  if (parsed.data.audience === "customer" && !isCustomer)
    return failure("This account cannot sign in here.", 403);
  if (
    parsed.data.audience === "staff" &&
    user.role !== "ADMIN" &&
    user.role !== "RIDER"
  )
    return failure("This account cannot sign in here.", 403);
  if (parsed.data.audience === "partner" && user.role !== "PARTNER")
    return failure("This account cannot sign in here.", 403);
  if (portal === "partner" && user.role !== "PARTNER")
    return failure("This account cannot sign in here.", 403);
  if (portal === "admin" && user.role !== "ADMIN")
    return failure("This account cannot sign in here.", 403);
  if (portal === "rider" && user.role !== "RIDER")
    return failure("This account cannot sign in here.", 403);

  await createSession(user);
  const landingPath =
    (user.role === "CUSTOMER" || user.role === "PARTNER") &&
    !user.emailVerifiedAt
      ? user.role === "PARTNER"
        ? "/partner/verify-email"
        : "/customer/verify-email"
      : roleLandingPath(user.role as Role);
  if (isBrowserForm) {
    return NextResponse.redirect(new URL(landingPath, request.url), 303);
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      role: user.role,
      redirectTo: landingPath,
    },
  });
}

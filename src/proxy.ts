import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_BY_ROLE } from "@/lib/auth/constants";
import { verifySession } from "@/lib/auth/token";
import { partnerPortalEnabled } from "@/lib/portal-surface";

function isStaffHost(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.split(":")[0]?.trim().toLowerCase() ?? request.nextUrl.hostname.toLowerCase();
  const configuredStaffOrigin = process.env.NEXT_PUBLIC_STAFF_ORIGIN ?? "";
  let configuredStaffHost = "";
  try {
    configuredStaffHost = new URL(configuredStaffOrigin).hostname.toLowerCase();
  } catch {
    configuredStaffHost = configuredStaffOrigin.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  }
  return host === "portal.karamebay.com" || host.includes("staff-portal") || Boolean(configuredStaffHost && host === configuredStaffHost);
}

function isPublicAuthRoute(path: string) {
  return (
    path === "/auth/login" ||
    path === "/auth/register" ||
    path === "/customer/login" ||
    path === "/customer/register" ||
    path === "/customer/forgot-password" ||
    path === "/customer/reset-password"
  );
}

async function hasCustomerSession(request: NextRequest) {
  const cookieName = SESSION_COOKIE_BY_ROLE.CUSTOMER;
  const rawCookieHeader = request.headers.get("cookie") ?? "";
  const tokens = rawCookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName}=`))
    .map((part) => part.slice(cookieName.length + 1))
    .filter(Boolean);
  const fallback = request.cookies.get(cookieName)?.value;
  if (fallback && !tokens.includes(fallback)) tokens.push(fallback);
  for (const token of tokens) {
    const session = await verifySession(token);
    if (session?.role === "CUSTOMER") return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const partnerRoute =
    path === "/staff" ||
    path.startsWith("/staff/") ||
    path === "/partner" ||
    path.startsWith("/partner/") ||
    path.startsWith("/api/partner/") ||
    request.nextUrl.searchParams.get("role") === "PARTNER";
  if (partnerRoute && !partnerPortalEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Staff deployments and their portals have their own role gates. Customer
  // authentication must never block Admin, Partner, or Rider entry points.
  const operationsRoute =
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/rider" ||
    path.startsWith("/rider/") ||
    path === "/staff" ||
    path.startsWith("/staff/") ||
    path === "/partner" ||
    path.startsWith("/partner/") ||
    isStaffHost(request);
  const technicalRoute =
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path === "/favicon.ico" ||
    /\.[^/]+$/.test(path);

  if (!operationsRoute && !technicalRoute && !isPublicAuthRoute(path)) {
    if (!(await hasCustomerSession(request))) {
      const loginUrl = new URL("/customer/login", request.url);
      const nextPath = `${path}${request.nextUrl.search}`;
      loginUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};

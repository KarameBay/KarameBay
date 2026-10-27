import { NextRequest, NextResponse } from "next/server";
import { partnerPortalEnabled } from "@/lib/portal-surface";

export function proxy(request: NextRequest) {
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
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/staff/:path*",
    "/partner/:path*",
    "/api/partner/:path*",
    "/api/auth/:path*",
  ],
};

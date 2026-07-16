import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLES, type Role } from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  const requestedRole = request.nextUrl.searchParams.get("role") as Role | null;
  const role = requestedRole && ROLES.includes(requestedRole) ? requestedRole : undefined;
  const user = await getCurrentUser(role);
  return user
    ? NextResponse.json({ user })
    : NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
}

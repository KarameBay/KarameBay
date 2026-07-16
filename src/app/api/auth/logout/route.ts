import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { ROLES, type Role } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const requestedRole = body?.role as Role | undefined;
  const role: Role =
    requestedRole && ROLES.includes(requestedRole) ? requestedRole : "CUSTOMER";
  await destroySession(role);
  return NextResponse.json({ ok: true });
}

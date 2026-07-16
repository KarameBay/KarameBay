import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin || admin.role !== "ADMIN")
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { id } = await params;
  const customer = await db.user.findFirst({ where: { id, role: "CUSTOMER" }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  await db.$transaction([
    db.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } }),
    db.emailVerificationChallenge.deleteMany({ where: { userId: id } }),
  ]);
  return NextResponse.json({ verified: true, verifiedAt: new Date().toISOString() });
}

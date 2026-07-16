import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const roleByPortal = { customer: "CUSTOMER", admin: "ADMIN", rider: "RIDER" } as const;
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const portal = new URL(request.url).searchParams.get("portal") as keyof typeof roleByPortal | null;
  const role = portal && roleByPortal[portal] ? roleByPortal[portal] : "CUSTOMER";
  const user = await getCurrentUser(role);
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const raw = decodeURIComponent((await params).id);
  const [kind, id] = raw.split(":", 2);
  const deleted = kind === "parcel"
    ? await db.parcelNotification.deleteMany({ where: { id, userId: user.id } })
    : await db.notification.deleteMany({ where: { id: kind === "order" ? id : raw, userId: user.id } });
  if (!deleted.count) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}


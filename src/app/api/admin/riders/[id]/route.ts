import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const patchSchema = z.object({
  accountStatus: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  riderStatus: z.enum(["AVAILABLE", "BUSY", "ON_DELIVERY", "OFFLINE"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid rider update" }, { status: 400 });

  const { id } = await params;
  const rider = await db.user.findFirst({
    where: { id, role: "RIDER" },
    select: { id: true },
  });
  if (!rider)
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });

  const data: Prisma.UserUpdateInput = {};
  if (parsed.data.accountStatus) data.status = parsed.data.accountStatus;
  if (parsed.data.riderStatus) {
    data.riderProfile = {
      upsert: {
        create: { riderStatus: parsed.data.riderStatus },
        update: {
          riderStatus: parsed.data.riderStatus,
          lastSeenAt: new Date(),
        },
      },
    };
  }

  await db.user.update({ where: { id }, data });
  revalidatePath("/admin");
  revalidatePath("/admin/riders");
  revalidatePath("/rider");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );

  const { id } = await params;
  const rider = await db.user.findFirst({
    where: { id, role: "RIDER" },
    select: { id: true },
  });
  if (!rider)
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });

  await db.user.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/admin/riders");
  revalidatePath("/rider");
  return NextResponse.json({ ok: true });
}

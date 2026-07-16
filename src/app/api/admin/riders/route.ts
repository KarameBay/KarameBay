import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PASSWORD_HASH_ROUNDS } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const riderSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8),
  password: z.string().min(8).optional().or(z.literal("")),
  accountStatus: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
  riderStatus: z.enum(["AVAILABLE", "BUSY", "ON_DELIVERY", "OFFLINE"]).default("OFFLINE"),
  vehicleType: z.string().trim().min(2),
  licensePlate: z.string().trim().optional().or(z.literal("")),
  photoUrl: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : null))
    .refine((value) => value === null || /^https?:\/\//i.test(value), {
      message: "Enter a valid URL",
    })
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );

  const parsed = riderSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid rider data" }, { status: 400 });

  const data = parsed.data;
  const createdAt = new Date();
  const riderProfileData = {
    vehicleType: data.vehicleType,
    licensePlate: data.licensePlate || null,
    riderStatus: data.riderStatus,
    photoUrl: data.photoUrl ?? null,
    lastSeenAt: createdAt,
    onlineSinceAt:
      data.riderStatus === "OFFLINE" ? null : createdAt,
  };

  if (data.id) {
    const existing = await db.user.findFirst({
      where: { id: data.id, role: "RIDER" },
      select: { id: true },
    });
    if (!existing)
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });

    const updateData: Prisma.UserUpdateInput = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      status: data.accountStatus,
    };
    if (data.password) updateData.passwordHash = await hash(data.password, PASSWORD_HASH_ROUNDS);

    const rider = await db.user.update({
      where: { id: data.id },
      data: updateData,
      include: { riderProfile: true, _count: { select: { deliveries: true } } },
    });

    await db.riderProfile.upsert({
      where: { userId: rider.id },
      update: riderProfileData,
      create: { userId: rider.id, ...riderProfileData },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/riders");
    revalidatePath("/rider");
    return NextResponse.json({ ok: true, rider });
  }

  const password = data.password?.trim();
  if (!password)
    return NextResponse.json(
      { error: "Password is required for a new rider account." },
      { status: 400 },
    );

  const rider = await db.user.create({
    data: {
      id: randomUUID(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      role: "RIDER",
      status: data.accountStatus,
      passwordHash: await hash(password, PASSWORD_HASH_ROUNDS),
      riderProfile: {
        create: riderProfileData,
      },
    },
    include: { riderProfile: true, _count: { select: { deliveries: true } } },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/riders");
  revalidatePath("/rider");
  return NextResponse.json({ ok: true, rider });
}

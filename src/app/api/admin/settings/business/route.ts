import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeRwandaPhone } from "@/lib/auth/phone";
import { db } from "@/lib/db";

const schema = z.object({
  businessName: z.string().trim().min(2).max(100),
  supportEmail: z.string().trim().email().max(160),
  supportPhone: z.string().trim().min(10).max(30),
  whatsappNumber: z.string().trim().min(10).max(30),
  businessAddress: z.string().trim().min(3).max(240),
  businessHours: z.string().trim().min(3).max(160),
  instagramUrl: z.union([z.string().trim().url().max(500), z.literal("")]),
});

export async function PUT(request: Request) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin || admin.role !== "ADMIN")
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Review the business profile fields." }, { status: 400 });
  const supportPhone = normalizeRwandaPhone(parsed.data.supportPhone);
  const whatsappNumber = normalizeRwandaPhone(parsed.data.whatsappNumber);
  if (!supportPhone || !whatsappNumber)
    return NextResponse.json({ error: "Use valid Rwanda phone numbers." }, { status: 400 });
  const profile = await db.businessProfile.upsert({
    where: { id: "business" },
    update: {
      ...parsed.data,
      instagramUrl: parsed.data.instagramUrl || null,
      supportPhone,
      whatsappNumber,
    },
    create: {
      id: "business",
      ...parsed.data,
      instagramUrl: parsed.data.instagramUrl || null,
      supportPhone,
      whatsappNumber,
    },
  });
  return NextResponse.json({ ok: true, profile });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const schema = z.object({
  label: z.string().trim().min(2).max(30),
  address: z.string().trim().min(3).max(300),
  details: z.string().trim().min(3).max(180),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export async function GET() {
  const user = await getCurrentUser("CUSTOMER");
  if (!user) return NextResponse.json({ addresses: [] });
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ addresses });
}
export async function POST(request: Request) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user)
    return NextResponse.json(
      { error: "Sign in to save an address for future orders." },
      { status: 401 },
    );
  if (user.role !== "CUSTOMER")
    return NextResponse.json(
      { error: "Only customer accounts can save delivery addresses." },
      { status: 403 },
    );
  if (!user.emailVerifiedAt)
    return NextResponse.json({ error: "Verify your email before saving an address." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the address label and delivery details." },
      { status: 400 },
    );
  const address = await db.address.upsert({
    where: { userId_label: { userId: user.id, label: parsed.data.label } },
    update: parsed.data,
    create: { ...parsed.data, userId: user.id },
  });
  return NextResponse.json({ address }, { status: 201 });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = await db.store.findFirst({
    where: { id, status: "APPROVED" },
    select: { id: true, name: true, latitude: true, longitude: true },
  });
  return store
    ? NextResponse.json({ store })
    : NextResponse.json({ error: "Store not found" }, { status: 404 });
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const schema = z.object({
  storeId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
});
export async function POST(request: Request) {
  if (!(await getCurrentUser("ADMIN")))
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a store and review decision." },
      { status: 400 },
    );
  const store = await db.store.findFirst({
    where: {
      id: parsed.data.storeId,
      owner: {
        role: "PARTNER",
        status: "ACTIVE",
        emailVerifiedAt: { not: null },
      },
      storeType: { isActive: true },
      status: { not: "ARCHIVED" },
    },
  });
  if (!store)
    return NextResponse.json(
      { error: "Active partner store not found." },
      { status: 404 },
    );
  await db.store.update({
    where: { id: store.id },
    data: { status: parsed.data.status },
  });
  for (const path of [
    "/partner",
    "/admin/partners",
    "/admin/stores",
    "/stores",
    "/explore",
    `/stores/${store.slug}`,
  ])
    revalidatePath(path);
  return NextResponse.json({ ok: true });
}

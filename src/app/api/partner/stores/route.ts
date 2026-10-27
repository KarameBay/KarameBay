import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getVerifiedPartner } from "@/lib/partner";
import { catalogEngineFor, legacyStoreTypeValue } from "@/lib/store-types";
import { normalizeRwandaPhone } from "@/lib/auth/phone";

const schema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(160),
  storeTypeId: z.string().min(1),
  description: z.string().trim().min(10).max(3000),
  phone: z
    .string()
    .transform((v) => normalizeRwandaPhone(v))
    .refine((v) => v !== null, "Enter a valid Rwanda phone number"),
  address: z.string().trim().min(3).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  isOpen: z.boolean(),
});

export async function POST(request: Request) {
  const partner = await getVerifiedPartner();
  if (!partner)
    return NextResponse.json(
      { error: "Sign in with a verified partner account." },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check your store details." },
      { status: 400 },
    );
  const { id, ...data } = parsed.data;
  const type = await db.storeType.findFirst({
    where: { id: data.storeTypeId, isActive: true },
  });
  if (!type)
    return NextResponse.json(
      { error: "Choose an active store type." },
      { status: 400 },
    );
  const catalogEngine = catalogEngineFor(type.commerceEngine);
  const outcome = await db.$transaction(
    async (tx) => {
      if (id) {
        const existing = await tx.store.findFirst({
          where: { id, ownerId: partner.id },
        });
        if (!existing) return { error: "Store not found.", status: 404 };
        if (!["PENDING", "APPROVED"].includes(existing.status))
          return {
            error: "Contact Karame Bay to update this store.",
            status: 403,
          };
        if (existing.storeTypeId !== type.id)
          return {
            error: "Contact Karame Bay to change your store type.",
            status: 409,
          };
        await tx.store.update({
          where: { id, ownerId: partner.id },
          data: { ...data, status: "PENDING" },
        });
        return { id, slug: existing.slug };
      }
      const store = await tx.store.create({
        data: {
          ...data,
          ownerId: partner.id,
          catalogEngine,
          type: legacyStoreTypeValue(type.name),
          status: "PENDING",
          slug: `${
            data.name
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 60) || "shop"
          }-${randomUUID().slice(0, 8)}`,
        },
      });
      if (catalogEngine === "RESTAURANT") {
        await tx.restaurantProfile.create({ data: { storeId: store.id } });
      } else {
        await tx.marketplaceProfile.create({
          data: {
            storeId: store.id,
            tracksInventory: type.stockTrackingRequired,
          },
        });
        const department = await tx.marketplaceDepartment.create({
          data: { storeId: store.id, name: "Catalog", slug: "catalog" },
        });
        await tx.marketplaceCategory.create({
          data: {
            departmentId: department.id,
            name: "All products",
            slug: "all-products",
          },
        });
      }
      return { id: store.id, slug: store.slug };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  if ("error" in outcome)
    return NextResponse.json(
      { error: outcome.error },
      { status: outcome.status },
    );
  for (const path of [
    "/partner",
    "/admin/stores",
    "/stores",
    "/explore",
    `/stores/${outcome.slug}`,
  ])
    revalidatePath(path);
  return NextResponse.json({
    ok: true,
    id: outcome.id,
    message: "Store submitted for admin approval.",
  });
}

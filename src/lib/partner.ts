import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { partnerPortalEnabled } from "@/lib/portal-surface";

export async function getVerifiedPartner() {
  if (!partnerPortalEnabled()) return null;
  const user = await getCurrentUser("PARTNER");
  return user?.emailVerifiedAt ? user : null;
}

export async function getPartnerWorkspace(ownerId: string) {
  const [stores, storeTypes] = await Promise.all([
    db.store.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
      include: {
        storeType: { select: { name: true, stockTrackingRequired: true } },
        _count: {
          select: { marketplaceProducts: true, restaurantProducts: true },
        },
      },
    }),
    db.storeType.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, commerceEngine: true },
    }),
  ]);
  return {
    stores: stores.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      phone: s.phone ?? "",
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      opensAt: s.opensAt,
      closesAt: s.closesAt,
      storeTypeId: s.storeTypeId ?? "",
      catalogEngine: s.catalogEngine,
      status: s.status,
      isOpen: s.isOpen,
      storeTypeName: s.storeType?.name ?? s.type,
      tracksInventory: s.storeType?.stockTrackingRequired ?? true,
      productCount: s._count.marketplaceProducts + s._count.restaurantProducts,
    })),
    storeTypes,
  };
}

// Products from the FDA's 5 August 2026 recall that were present in our catalog.
// Keep removed listings from being introduced again through partner onboarding.
export function isRecalledAlcohol(name: string) {
  return /\b(gilbey[’'\s]*s?|bond\s*7|konyagi|k[\s-]*vant|boss\s+(?:imported\s+)?whisk[ey]*|avalon\s+premium|exo\s+vodka)\b/i.test(
    name,
  );
}

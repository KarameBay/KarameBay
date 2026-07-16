import { NextResponse } from "next/server";
import { getStores } from "@/lib/catalog";
export async function GET() {
  const stores = await getStores();
  return NextResponse.json({
    stores: stores.map((store) => ({
      slug: store.slug,
      name: store.name,
      type: store.type,
      isOpen: store.isOpen,
      opensAt: store.opensAt,
      closesAt: store.closesAt,
      estimatedDeliveryMinutes: store.estimatedDeliveryMinutes,
      productCount: store._count.products,
    })),
  });
}

import { notFound } from "next/navigation";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { RestaurantProductDetail } from "@/components/catalog/restaurant-product-detail";
import { getRestaurantProductDetails, getStoreBySlug } from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string; productId: string }>;
};

export default async function RestaurantProductPage({ params }: Props) {
  const { slug, productId } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || store.catalogEngine !== "RESTAURANT") notFound();

  const product = await getRestaurantProductDetails(slug, productId);
  if (!product) notFound();

  return (
    <>
      <BrowseHeader />
      <RestaurantProductDetail product={product} />
    </>
  );
}

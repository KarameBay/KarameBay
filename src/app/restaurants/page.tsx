import type { Metadata } from "next";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { PublicFooter } from "@/components/catalog/public-footer";
import { StoreDirectory } from "@/components/catalog/explore-content";
import { getStores } from "@/lib/catalog";
import "../explore.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restaurants | Karame Bay",
  description: "Browse restaurants and coffee shops delivering across Kigali.",
};

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const stores = (await getStores(query)).filter(
    (store) => store.catalogEngine === "RESTAURANT",
  );

  return (
    <div className="app-shell">
      <BrowseHeader />
      <StoreDirectory kind="restaurants" query={query} stores={stores} />
      <PublicFooter />
    </div>
  );
}

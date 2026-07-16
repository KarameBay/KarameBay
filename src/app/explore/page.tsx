import type { Metadata } from "next";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { ExploreOverview } from "@/components/catalog/explore-content";
import { PublicFooter } from "@/components/catalog/public-footer";
import { getStores } from "@/lib/catalog";
import "../explore.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore | Karame Bay",
  description: "Explore restaurants, markets, and parcel delivery in Kigali.",
};

export default async function ExplorePage() {
  const stores = await getStores();

  return (
    <div className="app-shell">
      <BrowseHeader />
      <ExploreOverview stores={stores} />
      <PublicFooter />
    </div>
  );
}

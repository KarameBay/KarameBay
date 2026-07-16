import type { Metadata } from "next";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { PublicFooter } from "@/components/catalog/public-footer";
import { StoreDirectory } from "@/components/catalog/explore-content";
import { getStores } from "@/lib/catalog";
import "../explore.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Markets | Karame Bay",
  description: "Browse trusted grocery and produce markets delivering in Kigali.",
};

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const stores = (await getStores(query)).filter(
    (store) => store.catalogEngine === "MARKETPLACE",
  );

  return (
    <div className="app-shell">
      <BrowseHeader />
      <StoreDirectory kind="markets" query={query} stores={stores} />
      <PublicFooter />
    </div>
  );
}

import Link from "next/link";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { PublicFooter } from "@/components/catalog/public-footer";
import { StoreCard } from "@/components/catalog/store-card";
import { HomeSearch } from "@/components/catalog/home-search";
import { getStores } from "@/lib/catalog";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const stores = await getStores(query);
  return (
    <div className="app-shell">
      <BrowseHeader />
      <main className="browse-page">
        <section className="browse-hero">
          <div>
            <span className="catalog-kicker">SHOP KIGALI</span>
            <h1>All local shops</h1>
            <p>Choose a partner or search for a product.</p>
          </div>
          <HomeSearch
            action="/stores"
            defaultValue={query}
            formClassName="browse-search"
            placeholder="Search stores or products"
          />
        </section>
        <section className="browse-stores" aria-label="Shop directory">
          <div className="browse-title">
            <p>{query ? `Results for "${query}"` : "Browse local partners in Kigali"}</p>
            <p>{stores.length} {stores.length === 1 ? "shop" : "shops"}</p>
          </div>
          {stores.length > 0 ? (
            <div className={`browse-store-grid directory-store-grid directory-store-grid-${Math.min(stores.length, 4)}`}>
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          ) : (
            <div className="catalog-empty">
              <Search aria-hidden="true" />
              <h3>{query ? "No matching shops or products" : "No shops available yet"}</h3>
              <p>{query ? "Try another shop, product, or category name." : "Approved partners will appear here when available."}</p>
              {query && <Link href="/stores">Clear search</Link>}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

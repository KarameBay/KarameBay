import { BrowseHeader } from "@/components/catalog/browse-header";
import { StoreCard } from "@/components/catalog/store-card";
import { getStores } from "@/lib/catalog";
import { MapPin, Search } from "lucide-react";

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
    <>
      <BrowseHeader />
      <main className="browse-page">
        <section className="browse-hero">
          <div>
            <span className="catalog-kicker">
              KIGALI&apos;S LOCAL MARKETPLACE
            </span>
            <h1>What can we bring you?</h1>
            <p>Browse trusted local stores and businesses near you.</p>
          </div>
          <form action="/stores" className="browse-search">
            <Search />
            <input
              name="q"
              defaultValue={query}
              maxLength={100}
              placeholder="Search stores or products"
            />
            <button>Search</button>
          </form>
          <div className="browse-location">
            <MapPin />
            <span>
              <small>DELIVERING TO</small>Choose delivery location
            </span>
          </div>
        </section>
        <section className="browse-stores">
          <div className="browse-title">
            <div>
              <span className="catalog-kicker">EXPLORE</span>
              <h2>{query ? `Results for “${query}”` : "Stores near you"}</h2>
            </div>
            <p>{stores.length} stores available</p>
          </div>
          <div className="browse-store-grid">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
          {!stores.length && (
            <div className="catalog-empty">
              <Search />
              <h3>No matching stores or products</h3>
              <p>Try a store, product, or category name.</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

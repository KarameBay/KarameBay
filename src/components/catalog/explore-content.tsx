import Link from "next/link";
import {
  ArrowRight,
  ChefHat,
  MapPin,
  Package,
  Search,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { StoreCard } from "@/components/catalog/store-card";
import type { getActiveStoreTypes, getStores } from "@/lib/catalog";

type StoreList = Awaited<ReturnType<typeof getStores>>;
type StoreTypeList = Awaited<ReturnType<typeof getActiveStoreTypes>>;

type DirectoryKind = "restaurants" | "markets";

function ExploreSection({
  eyebrow,
  title,
  description,
  href,
  stores,
  id,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  stores: StoreList;
  id: string;
}) {
  return (
    <section className="explore-section" id={id}>
      <div className="explore-section-heading">
        <div>
          <span className="catalog-kicker">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Link href={href}>
          View all <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {stores.length > 0 ? (
        <div className="explore-store-grid">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <div className="explore-empty">
          <MapPin aria-hidden="true" />
          <div>
            <h3>More locations are coming</h3>
            <p>Karame Bay will show approved stores here as they are added.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function ExploreOverview({
  stores,
  storeTypes,
}: {
  stores: StoreList;
  storeTypes: StoreTypeList;
}) {
  return (
    <main className="explore-page">
      <section className="explore-hero">
        <div className="explore-hero-copy">
          <span className="catalog-kicker">EXPLORE KARAME BAY</span>
          <h1>Discover Kigali, delivered.</h1>
          <p>
            Browse local businesses by category or book a secure parcel
            delivery from one place.
          </p>
        </div>
        <nav className="explore-jump-grid" aria-label="Explore services">
          {storeTypes.map((storeType) => (
            <Link href={`#${storeType.slug}`} key={storeType.id}>
              <span>
                {storeType.iconUrl || storeType.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={storeType.iconUrl ?? storeType.imageUrl ?? ""} alt="" />
                ) : storeType.commerceEngine === "RESTAURANT" ? (
                  <ChefHat aria-hidden="true" />
                ) : (
                  <Store aria-hidden="true" />
                )}
              </span>
              <strong>{storeType.customerSectionName}</strong>
              <small>{storeType.description}</small>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
          <Link href="#send-a-parcel">
            <span><Package aria-hidden="true" /></span>
            <strong>Send a Parcel</strong>
            <small>Pickup and delivery in Kigali</small>
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </section>

      {storeTypes.map((storeType) => (
        <ExploreSection
          key={storeType.id}
          id={storeType.slug}
          eyebrow={storeType.isFeatured ? "FEATURED" : "EXPLORE"}
          title={storeType.customerSectionName}
          description={storeType.description}
          href={`/explore/${storeType.slug}`}
          stores={stores.filter((store) => store.storeTypeId === storeType.id).slice(0, 4)}
        />
      ))}

      <section className="explore-parcel" id="send-a-parcel">
        <div className="explore-parcel-icon"><Package aria-hidden="true" /></div>
        <div>
          <span className="catalog-kicker">KARAME PARCEL DELIVERY</span>
          <h2>Send a Parcel</h2>
          <p>
            Arrange a secure pickup-to-delivery route for documents, clothes,
            packages, and everyday items across Kigali.
          </p>
          <ul>
            <li>Live route distance and ETA</li>
            <li>Reviewed delivery</li>
            <li>Tracked by a Karame rider</li>
          </ul>
        </div>
        <Link href="/customer/parcels/new">
          Start a delivery <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}

export function StoreDirectory({
  kind,
  stores,
  query,
}: {
  kind: DirectoryKind;
  stores: StoreList;
  query: string;
}) {
  const isRestaurants = kind === "restaurants";
  const title = isRestaurants ? "Restaurants" : "Markets";
  const Icon = isRestaurants ? ChefHat : ShoppingBasket;
  const description = isRestaurants
    ? "Browse restaurant and coffee-shop menus available through Karame Bay."
    : "Shop groceries, produce, and household essentials from trusted markets.";

  return (
    <main className="explore-page directory-page">
      <section className="directory-hero">
        <div>
          <span className="directory-icon"><Icon aria-hidden="true" /></span>
          <span className="catalog-kicker">EXPLORE KIGALI</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <form action={`/${kind}`} className="directory-search" role="search">
          <Search aria-hidden="true" />
          <input
            defaultValue={query}
            maxLength={100}
            name="q"
            placeholder={`Search ${kind} or products`}
          />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="directory-results">
        <div className="directory-results-heading">
          <div>
            <span className="catalog-kicker">
              {query ? "SEARCH RESULTS" : `ALL ${title.toUpperCase()}`}
            </span>
            <h2>{query ? `Results for “${query}”` : title}</h2>
          </div>
          <p>{stores.length} {stores.length === 1 ? "store" : "stores"}</p>
        </div>

        {stores.length > 0 ? (
          <div className="explore-store-grid">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div className="directory-empty">
            <Search aria-hidden="true" />
            <h3>No matching {kind}</h3>
            <p>Try another store, product, or category name.</p>
            <Link href={`/${kind}`}>Clear search</Link>
          </div>
        )}
      </section>
    </main>
  );
}

export function StoreTypeDirectory({
  storeType,
  stores,
  query,
}: {
  storeType: StoreTypeList[number];
  stores: StoreList;
  query: string;
}) {
  return (
    <main className="explore-page directory-page">
      <section className="directory-hero">
        <div>
          <span className="directory-icon">
            {storeType.iconUrl || storeType.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storeType.iconUrl ?? storeType.imageUrl ?? ""} alt="" />
            ) : storeType.commerceEngine === "RESTAURANT" ? (
              <ChefHat aria-hidden="true" />
            ) : (
              <Store aria-hidden="true" />
            )}
          </span>
          <span className="catalog-kicker">EXPLORE KIGALI</span>
          <h1>{storeType.customerSectionName}</h1>
          <p>{storeType.description}</p>
        </div>
        <form action={`/explore/${storeType.slug}`} className="directory-search" role="search">
          <Search aria-hidden="true" />
          <input
            defaultValue={query}
            maxLength={100}
            name="q"
            placeholder={`Search ${storeType.customerSectionName.toLowerCase()} or products`}
          />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="directory-results">
        <div className="directory-results-heading">
          <div>
            <span className="catalog-kicker">{query ? "SEARCH RESULTS" : "ALL STORES"}</span>
            <h2>{query ? `Results for “${query}”` : storeType.customerSectionName}</h2>
          </div>
          <p>{stores.length} {stores.length === 1 ? "store" : "stores"}</p>
        </div>

        {stores.length > 0 ? (
          <div className="explore-store-grid">
            {stores.map((store) => <StoreCard key={store.id} store={store} />)}
          </div>
        ) : (
          <div className="directory-empty">
            <Search aria-hidden="true" />
            <h3>No matching stores</h3>
            <p>Try another store, product, category, or keyword.</p>
            <Link href={`/explore/${storeType.slug}`}>Clear search</Link>
          </div>
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  ChefHat,
  Package,
  Search,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { StoreCard } from "@/components/catalog/store-card";
import { HomeSearch } from "@/components/catalog/home-search";
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

      <div className="explore-store-grid">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
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
  const availableStoreTypes = storeTypes.filter((storeType) =>
    stores.some((store) => store.storeTypeId === storeType.id),
  );

  return (
    <main className="explore-page">
      <section className="explore-hero">
        <div className="explore-hero-copy">
          <span className="catalog-kicker">EXPLORE KARAME BAY</span>
          <h1>Explore local partners.</h1>
          <p>Find a store to shop from or send a parcel across Kigali.</p>
        </div>
        <nav className="explore-jump-grid" aria-label="Explore services">
          {availableStoreTypes.map((storeType) => (
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

      {availableStoreTypes.map((storeType) => (
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
        <HomeSearch
          action={`/${kind}`}
          defaultValue={query}
          formClassName="directory-search"
          placeholder={`Search ${kind} or products`}
          storeTypeSlug={kind}
        />
      </section>

      <section className="directory-results" aria-label={`${title} directory`}>
        <div className="directory-results-heading">
          <p>{query ? `Results for "${query}"` : `Browse ${title.toLowerCase()} in Kigali`}</p>
          <p>{stores.length} {stores.length === 1 ? "store" : "stores"}</p>
        </div>

        {stores.length > 0 ? (
          <div className={`explore-store-grid directory-store-grid directory-store-grid-${Math.min(stores.length, 4)}`}>
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div className="directory-empty">
            <Search aria-hidden="true" />
            <h3>{query ? `No matching ${kind}` : `No ${kind} available yet`}</h3>
            <p>{query ? "Try another store, product, or category name." : "Approved partners will appear here when available."}</p>
            {query && <Link href={`/${kind}`}>Clear search</Link>}
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
        <HomeSearch
          action={`/explore/${storeType.slug}`}
          defaultValue={query}
          formClassName="directory-search"
          placeholder={`Search ${storeType.customerSectionName.toLowerCase()} or products`}
          storeTypeSlug={storeType.slug}
        />
      </section>

      <section className="directory-results" aria-label={`${storeType.customerSectionName} directory`}>
        <div className="directory-results-heading">
          <p>{query ? `Results for "${query}"` : `Browse ${storeType.customerSectionName.toLowerCase()} in Kigali`}</p>
          <p>{stores.length} {stores.length === 1 ? "store" : "stores"}</p>
        </div>

        {stores.length > 0 ? (
          <div className={`explore-store-grid directory-store-grid directory-store-grid-${Math.min(stores.length, 4)}`}>
            {stores.map((store) => <StoreCard key={store.id} store={store} />)}
          </div>
        ) : (
          <div className="directory-empty">
            <Search aria-hidden="true" />
            <h3>{query ? "No matching stores" : "No stores available yet"}</h3>
            <p>{query ? "Try another store, product, category, or keyword." : "Approved partners will appear here when available."}</p>
            {query && <Link href={`/explore/${storeType.slug}`}>Clear search</Link>}
          </div>
        )}
      </section>
    </main>
  );
}

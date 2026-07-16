import Link from "next/link";
import {
  ArrowRight,
  ChefHat,
  MapPin,
  Package,
  Search,
  ShoppingBasket,
} from "lucide-react";
import { StoreCard } from "@/components/catalog/store-card";
import type { getStores } from "@/lib/catalog";

type StoreList = Awaited<ReturnType<typeof getStores>>;

type DirectoryKind = "restaurants" | "markets";

function ExploreSection({
  eyebrow,
  title,
  description,
  href,
  stores,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  stores: StoreList;
}) {
  return (
    <section className="explore-section" id={title.toLowerCase()}>
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

export function ExploreOverview({ stores }: { stores: StoreList }) {
  const restaurants = stores
    .filter((store) => store.catalogEngine === "RESTAURANT")
    .slice(0, 4);
  const markets = stores
    .filter((store) => store.catalogEngine === "MARKETPLACE")
    .slice(0, 4);

  return (
    <main className="explore-page">
      <section className="explore-hero">
        <div className="explore-hero-copy">
          <span className="catalog-kicker">EXPLORE KARAME BAY</span>
          <h1>Discover Kigali, delivered.</h1>
          <p>
            Browse restaurant menus, shop trusted markets, or book a secure
            parcel delivery from one place.
          </p>
        </div>
        <nav className="explore-jump-grid" aria-label="Explore services">
          <Link href="#restaurants">
            <span><ChefHat aria-hidden="true" /></span>
            <strong>Restaurants</strong>
            <small>Meals, coffee and more</small>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="#markets">
            <span><ShoppingBasket aria-hidden="true" /></span>
            <strong>Markets</strong>
            <small>Groceries and essentials</small>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="#send-a-parcel">
            <span><Package aria-hidden="true" /></span>
            <strong>Send a Parcel</strong>
            <small>Pickup and delivery in Kigali</small>
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </section>

      <ExploreSection
        eyebrow="FOOD & DRINK"
        title="Restaurants"
        description="Explore menus from restaurants and coffee shops across Kigali."
        href="/restaurants"
        stores={restaurants}
      />

      <ExploreSection
        eyebrow="GROCERIES & ESSENTIALS"
        title="Markets"
        description="Shop fresh produce, groceries, household items, and everyday essentials."
        href="/markets"
        stores={markets}
      />

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

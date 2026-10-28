import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bike,
  Clock3,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBasket,
  ShoppingBag,
  Store,
  Utensils,
} from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { StoreCard } from "@/components/catalog/store-card";
import { HomeSearch } from "@/components/catalog/home-search";
import { PublicFooter } from "@/components/catalog/public-footer";
import { getStores } from "@/lib/catalog";
import { getBusinessProfile } from "@/lib/business-profile";
import { phoneDisplay, phoneHref, whatsappHref } from "@/lib/contact";
import { isStaffPortalRequest } from "@/lib/portal-host";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (await isStaffPortalRequest()) redirect("/staff");

  const [stores, business] = await Promise.all([getStores(), getBusinessProfile()]);
  const hasRestaurants = stores.some((store) => store.catalogEngine === "RESTAURANT");
  const hasMarkets = stores.some((store) => store.catalogEngine === "MARKETPLACE");
  const services = [
    hasRestaurants && { href: "/restaurants", title: "Restaurants", description: "Meals from local restaurants", icon: Utensils },
    hasMarkets && { href: "/markets", title: "Groceries", description: "Everyday market essentials", icon: ShoppingBasket },
    stores.length > 0 && { href: "/stores", title: "Shops", description: "Browse all available stores", icon: Store },
    { href: "/customer/parcels/new", title: "Send a parcel", description: "Book a Kigali delivery", icon: Package },
  ].filter(Boolean) as { href: string; title: string; description: string; icon: typeof Store }[];
  return (
    <div className="app-shell">
      <BrowseHeader />
      <main>
        <section className="home-hero">
          <div className="home-hero-image" />
          <div className="home-hero-content">
            <div className="home-hero-copy">
              <span className="eyebrow">KIGALI, DELIVERED</span>
              <h1>
                Shop local, get it <i>delivered.</i>
              </h1>
              <p>Search products or choose a local shop below.</p>
            </div>
            <HomeSearch />
          </div>
        </section>

        <section className="home-stores" aria-labelledby="home-stores-title">
          <div className="home-section-title">
            <div>
              <span className="catalog-kicker">SHOP PARTNERS</span>
              <h2 id="home-stores-title">Browse local shops</h2>
              <p>Open a shop to see its live products and availability.</p>
            </div>
            <Link href="/stores">Shop directory <ArrowRight /></Link>
          </div>
          {stores.length > 0 ? (
            <div className="browse-store-grid home-partner-grid">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          ) : (
            <p className="home-stores-empty">New local shops will appear here once they are available.</p>
          )}
        </section>

        <section className="home-services" aria-labelledby="home-services-title">
          <div className="home-services-heading">
            <div>
              <span className="catalog-kicker">MORE WAYS TO USE KARAME BAY</span>
              <h2 id="home-services-title">Find what you need</h2>
            </div>
            <Link href="/explore">Explore everything <ArrowRight /></Link>
          </div>
          <div className="home-service-grid">
            {services.map((service) => {
              const Icon = service.icon;
              return <Link href={service.href} key={service.href} className="home-service-card"><span><Icon /></span><div><b>{service.title}</b><small>{service.description}</small></div><ArrowRight /></Link>;
            })}
          </div>
        </section>

        <section
          className="home-trust"
          aria-label="Karame Bay service benefits"
        >
          <div>
            <Clock3 />
            <span>
              <b>Delivery you can follow</b>
              <small>Clear updates on every order</small>
            </span>
          </div>
          <div>
            <MapPin />
            <span>
              <b>Choose your location</b>
              <small>Search or pin your delivery point</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <b>Simple checkout</b>
              <small>Review your order before you pay</small>
            </span>
          </div>
          <div>
            <Bike />
            <span>
              <b>Local Karame riders</b>
              <small>Ready for your delivery</small>
            </span>
          </div>
        </section>

        <section className="home-parcel-service">
          <div className="home-parcel-icon">
            <Package />
          </div>
          <div>
            <span className="catalog-kicker">KARAME PARCEL DELIVERY</span>
            <h2>Send a Parcel</h2>
            <p>
              Book a secure pickup-to-delivery route for documents, clothes,
              packages, and everyday items across Kigali.
            </p>
            <ul>
              <li><MapPin /> Choose pickup and delivery points</li>
              <li><ShieldCheck /> Reviewed and delivery tracked</li>
              <li><Clock3 /> Live route distance and ETA</li>
            </ul>
          </div>
          <Link href="/customer/parcels/new">
            Start a parcel delivery <ArrowRight />
          </Link>
        </section>

        <section className="home-how">
          <span className="catalog-kicker">HOW IT WORKS</span>
          <h2>From the store to your door</h2>
          <div>
            <article>
              <Store />
              <span>01</span>
              <h3>Choose a store</h3>
              <p>Browse the live catalog and add products from one store.</p>
            </article>
            <article>
              <MapPin />
              <span>02</span>
              <h3>Confirm your location</h3>
              <p>
                Use GPS, search, or drag the pin for a routed delivery quote.
              </p>
            </article>
            <article>
              <ShoppingBag />
              <span>03</span>
              <h3>Pay and track</h3>
              <p>Complete MoMo payment and follow every order update.</p>
            </article>
          </div>
        </section>

        <section className="home-delivery-brand">
          <div>
            <span className="catalog-kicker">KARAME TRANSPORT & DELIVERY</span>
            <h2>Your package is safe with us.</h2>
            <p>
              Karame Bay is backed by the local delivery team serving Kigali by
              motorcycle and van, every day.
            </p>
            <div>
              <a href={phoneHref(business.supportPhone)}>{phoneDisplay(business.supportPhone)}</a>
              <a href={whatsappHref(business.whatsappNumber, business.businessName)} target="_blank" rel="noreferrer">WhatsApp support</a>
            </div>
          </div>
          <div className="home-campaigns">
            <Image
              src="/images/karame-campaign-service-hq.png"
              alt="Karame transport and delivery service flyer"
              width={1124}
              height={1399}
            />
            <Image
              src="/images/karame-campaign-safe-hq.png"
              alt="Karame transport and delivery poster"
              width={1068}
              height={1473}
            />
          </div>
        </section>

      </main>
      <PublicFooter />
    </div>
  );
}

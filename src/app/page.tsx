import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Apple,
  ArrowRight,
  Bike,
  Clock3,
  MapPin,
  Package,
  Play,
  ShieldCheck,
  ShoppingBag,
  Store,
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
  if (await isStaffPortalRequest()) redirect("/admin/login");

  const [stores, business] = await Promise.all([getStores(), getBusinessProfile()]);
  return (
    <div className="app-shell">
      <BrowseHeader />
      <main>
        <section className="home-hero">
          <div className="home-hero-image" />
          <div className="home-hero-content">
            <span className="eyebrow">KIGALI, DELIVERED</span>
            <h1>
              Everything you need,
              <br /> right at your <i>door.</i>
            </h1>
            <p>
              Local stores, trusted businesses, and reliable Karame delivery in
              one simple marketplace.
            </p>
            <HomeSearch />
            <div className="home-actions">
              <Link href="/explore">
                Explore <ArrowRight />
              </Link>
              <Link href="/customer/orders">Track my orders</Link>
            </div>
          </div>
        </section>

        <section
          className="home-trust"
          aria-label="Karame Bay service benefits"
        >
          <div>
            <Clock3 />
            <span>
              <b>Fast local delivery</b>
              <small>Live route estimates</small>
            </span>
          </div>
          <div>
            <MapPin />
            <span>
              <b>Accurate locations</b>
              <small>OpenStreetMap routing</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <b>Verified payments</b>
              <small>Secure MoMo review</small>
            </span>
          </div>
          <div>
            <Bike />
            <span>
              <b>Karame riders</b>
              <small>Tracked to your door</small>
            </span>
          </div>
        </section>

        <section className="home-stores">
          <div className="home-section-title">
            <div>
              <span className="catalog-kicker">AVAILABLE STORES</span>
              <h2>What can we bring you?</h2>
              <p>Live products and availability from the Karame Bay catalog.</p>
            </div>
            <Link href="/explore">
              Explore all <ArrowRight />
            </Link>
          </div>
          <div className="browse-store-grid">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
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
              src="/images/karame-campaign-service.jpeg"
              alt="Karame transport and delivery service flyer"
              width={784}
              height={980}
            />
            <Image
              src="/images/karame-campaign-safe.jpeg"
              alt="Karame transport and delivery poster"
              width={784}
              height={1080}
            />
          </div>
        </section>

        <section className="home-app-coming" aria-labelledby="mobile-apps-title">
          <div>
            <span className="catalog-kicker">KARAME BAY MOBILE</span>
            <h2 id="mobile-apps-title">Your deliveries, soon in your pocket.</h2>
            <p>
              The Karame Bay mobile apps are being prepared for Android and
              iPhone. Keep using the website while we get them ready.
            </p>
          </div>
          <div className="home-app-badges" aria-label="Mobile apps coming soon">
            <span aria-disabled="true"><Play /><small>Coming soon on</small><b>Google Play</b></span>
            <span aria-disabled="true"><Apple /><small>Coming soon on the</small><b>App Store</b></span>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

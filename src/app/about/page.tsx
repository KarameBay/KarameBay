import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  MapPinned,
  Package,
  ShieldCheck,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { PublicFooter } from "@/components/catalog/public-footer";

export const metadata: Metadata = {
  title: "About Us | Karame Bay",
  description:
    "Learn how Karame Bay connects Kigali customers with stores, markets, and reliable local delivery.",
};

const services = [
  {
    icon: Store,
    title: "Restaurant delivery",
    text: "Browse restaurant menus, choose your options, and follow the order from confirmation to delivery.",
  },
  {
    icon: ShoppingBasket,
    title: "Market shopping",
    text: "Find everyday groceries and household essentials in organized, searchable local catalogs.",
  },
  {
    icon: Package,
    title: "Parcel delivery",
    text: "Send a package between two Kigali locations with a routed price and clear handover tracking.",
  },
];

export default function AboutPage() {
  return (
    <div className="app-shell public-info-shell">
      <BrowseHeader />
      <main>
        <section className="public-info-hero">
          <div>
            <span className="catalog-kicker">ABOUT KARAME BAY</span>
            <h1>Local delivery, brought together in one clear experience.</h1>
            <p>
              Karame Bay connects Kigali customers with restaurants, markets,
              and Karame&apos;s delivery team through one simple marketplace.
            </p>
            <div className="public-info-actions">
              <Link href="/stores">Browse stores <ArrowRight /></Link>
              <Link href="/customer/parcels/new">Send a parcel</Link>
            </div>
          </div>
          <div className="public-info-hero-art">
            <Image
              src="/images/karame-rider-hero.png"
              alt="Karame delivery rider in branded safety clothing"
              width={760}
              height={760}
              priority
            />
          </div>
        </section>

        <section className="public-info-section public-about-intro">
          <div>
            <span className="catalog-kicker">OUR PURPOSE</span>
            <h2>Make local delivery easier to understand and easier to trust.</h2>
          </div>
          <p>
            Customers see the store, products, routed delivery cost, payment
            state, and delivery progress in one place. Karame Bay keeps food,
            market, and parcel services separate so every journey stays clear.
          </p>
        </section>

        <section className="public-info-section public-service-section">
          <div className="public-info-section-heading">
            <span className="catalog-kicker">WHAT WE DELIVER</span>
            <h2>Three services, one Karame Bay experience.</h2>
          </div>
          <div className="public-service-grid">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title}>
                  <span><Icon /></span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="public-info-section public-trust-story">
          <div className="public-trust-visual">
            <Bike />
            <strong>Your package is safe with us.</strong>
            <small>Karame Transport &amp; Delivery</small>
          </div>
          <div>
            <span className="catalog-kicker">BUILT FOR KIGALI</span>
            <h2>Delivery details you can follow.</h2>
            <ul>
              <li><MapPinned /><span><b>Routed locations</b>Pickup and delivery distance comes from the road route, not a straight line.</span></li>
              <li><ShieldCheck /><span><b>Verified workflow</b>Payments, assignments, and delivery updates follow clear role-based steps.</span></li>
              <li><Package /><span><b>Separate service journeys</b>Shopping baskets and parcel bookings remain independent and easy to track.</span></li>
            </ul>
          </div>
        </section>

        <section className="public-info-cta">
          <div>
            <span className="catalog-kicker">READY WHEN YOU ARE</span>
            <h2>Choose what Karame Bay can deliver for you.</h2>
          </div>
          <div>
            <Link href="/stores">Shop from stores <ArrowRight /></Link>
            <Link href="/contact">Contact our team</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

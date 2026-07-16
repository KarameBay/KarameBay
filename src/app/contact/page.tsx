import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Camera,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { PublicFooter } from "@/components/catalog/public-footer";

export const metadata: Metadata = {
  title: "Contact Us | Karame Bay",
  description:
    "Contact Karame Bay for customer, order, parcel, and delivery support in Kigali.",
};

const INSTAGRAM_URL =
  "https://www.instagram.com/karame_transport_delivery?igsh=bHh4Mjdya2M2c2lp";

export default function ContactPage() {
  return (
    <div className="app-shell public-info-shell">
      <BrowseHeader />
      <main>
        <section className="public-contact-hero">
          <span className="catalog-kicker">CONTACT KARAME BAY</span>
          <h1>How can we help with your delivery?</h1>
          <p>
            Reach the Karame team for store orders, parcel deliveries, account
            questions, or delivery support across Kigali.
          </p>
        </section>

        <section className="public-info-section public-contact-grid" aria-label="Karame Bay contact options">
          <a href="tel:+250789950707">
            <span><Phone /></span>
            <small>PRIMARY PHONE</small>
            <strong>078 995 0707</strong>
            <em>Open phone</em>
          </a>
          <a href="tel:+250791889095">
            <span><Phone /></span>
            <small>ALTERNATIVE NUMBER</small>
            <strong>079 188 9095</strong>
            <em>Open phone</em>
          </a>
          <a href="mailto:karamebay3@gmail.com">
            <span><Mail /></span>
            <small>EMAIL SUPPORT</small>
            <strong>karamebay3@gmail.com</strong>
            <em>Write an email</em>
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            <span><Camera /></span>
            <small>FOLLOW KARAME</small>
            <strong>Instagram</strong>
            <em>Open profile</em>
          </a>
        </section>

        <section className="public-info-section public-contact-support">
          <div>
            <span className="catalog-kicker">GET FASTER HELP</span>
            <h2>Have the right details ready.</h2>
            <p>
              For an existing delivery, include the order or parcel reference
              and the phone number used for the booking. Never share your
              password or email verification code.
            </p>
          </div>
          <div className="public-support-options">
            <article>
              <ShoppingBag />
              <div><b>Store order</b><p>Open your order page first so the latest status and reference are ready.</p></div>
              <Link href="/customer/orders">My orders <ArrowRight /></Link>
            </article>
            <article>
              <PackageSearch />
              <div><b>Parcel delivery</b><p>Use parcel tracking to review the current handover and rider status.</p></div>
              <Link href="/customer/parcels">My parcels <ArrowRight /></Link>
            </article>
          </div>
        </section>

        <section className="public-info-section public-contact-note">
          <MapPin />
          <div>
            <b>Serving Kigali, Rwanda</b>
            <p>Use the map pin and exact address details during booking so the delivery route is accurate.</p>
          </div>
          <Clock3 />
          <div>
            <b>Track before contacting support</b>
            <p>Your customer account shows the latest order and parcel delivery updates.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

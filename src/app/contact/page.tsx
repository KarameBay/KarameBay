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
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { PublicFooter } from "@/components/catalog/public-footer";
import { getBusinessProfile } from "@/lib/business-profile";
import { mailHref, phoneDisplay, phoneHref, whatsappHref } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact Us | Karame Bay",
  description:
    "Contact Karame Bay for customer, order, parcel, and delivery support in Kigali.",
};

export default async function ContactPage() {
  const business = await getBusinessProfile();
  return (
    <div className="app-shell public-info-shell">
      <BrowseHeader />
      <main>
        <section className="public-contact-hero">
          <span className="catalog-kicker">CONTACT KARAME BAY</span>
          <h1>How can we help with your delivery?</h1>
          <p>
            Reach the {business.businessName} team for store orders, parcel deliveries, account
            questions, or delivery support across Kigali.
          </p>
        </section>

        <section className="public-info-section public-contact-grid" aria-label="Karame Bay contact options">
          <a href={phoneHref(business.supportPhone)}>
            <span><Phone /></span>
            <small>PRIMARY PHONE</small>
            <strong>{phoneDisplay(business.supportPhone)}</strong>
            <em>Open phone</em>
          </a>
          <a href={whatsappHref(business.whatsappNumber, business.businessName)} target="_blank" rel="noreferrer">
            <span><MessageCircle /></span>
            <small>WHATSAPP SUPPORT</small>
            <strong>{phoneDisplay(business.whatsappNumber)}</strong>
            <em>Start WhatsApp chat</em>
          </a>
          <a href={mailHref(business.supportEmail)}>
            <span><Mail /></span>
            <small>EMAIL SUPPORT</small>
            <strong>{business.supportEmail}</strong>
            <em>Write an email</em>
          </a>
          {business.instagramUrl && <a href={business.instagramUrl} target="_blank" rel="noreferrer">
            <span><Camera /></span>
            <small>FOLLOW KARAME</small>
            <strong>Instagram</strong>
            <em>Open profile</em>
          </a>}
        </section>

        <section className="public-info-section public-contact-support" id="report-issue">
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
            <b>{business.businessAddress}</b>
            <p>{business.businessHours}. Use the map pin and exact address details during booking.</p>
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

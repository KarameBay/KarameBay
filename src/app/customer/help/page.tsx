import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { requireRole } from "@/lib/auth/session";
import { getBusinessProfile } from "@/lib/business-profile";
import { mailHref, phoneDisplay, phoneHref, whatsappHref } from "@/lib/contact";

export const dynamic = "force-dynamic";

export default async function CustomerHelpPage() {
  await requireRole("CUSTOMER");
  const business = await getBusinessProfile();

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="help"
        title="Help & Support"
        description={`Get help from ${business.businessName}.`}
      >
        <header className="customer-help-heading">
          <span className="catalog-kicker">CUSTOMER SUPPORT</span>
          <h1>How can we help?</h1>
          <p>{business.businessHours} · {business.businessAddress}</p>
        </header>

        <section className="customer-help-grid" aria-label="Contact support">
          <a href={phoneHref(business.supportPhone)}>
            <Phone /><b>Call support</b><span>{phoneDisplay(business.supportPhone)}</span>
          </a>
          <a href={whatsappHref(business.whatsappNumber, business.businessName)} target="_blank" rel="noreferrer">
            <MessageCircle /><b>WhatsApp</b><span>{phoneDisplay(business.whatsappNumber)}</span>
          </a>
          <a href={mailHref(business.supportEmail)}>
            <Mail /><b>Email support</b><span>{business.supportEmail}</span>
          </a>
        </section>

        <section className="customer-help-section">
          <h2>Find an answer</h2>
          <nav className="customer-help-links" aria-label="Help topics">
            <Link href="/faq">Frequently asked questions</Link>
            <Link href="/customer/orders">Track a store order</Link>
            <Link href="/customer/parcels">Track a parcel</Link>
            <Link href="/contact#report-issue">How to report an issue</Link>
          </nav>
        </section>

        <section className="customer-help-section">
          <h2>Policies</h2>
          <nav className="customer-help-links" aria-label="Service policies">
            <Link href="/delivery-policy">Delivery policy</Link>
            <Link href="/refund-policy">Refund policy</Link>
            <Link href="/parcel-policy">Parcel delivery policy</Link>
            <Link href="/prohibited-parcel-items">Prohibited parcel items</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms &amp; conditions</Link>
          </nav>
        </section>
      </CustomerPortalShell>
    </>
  );
}

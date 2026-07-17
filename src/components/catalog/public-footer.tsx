import Link from "next/link";
import { Camera, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getBusinessProfile } from "@/lib/business-profile";
import { mailHref, phoneDisplay, phoneHref, whatsappHref } from "@/lib/contact";

export async function PublicFooter() {
  const business = await getBusinessProfile();
  return (
    <footer className="public-footer">
      <div className="public-footer-brand">
        <Link href="/" aria-label={`${business.businessName} home`}>
          {business.businessName}
        </Link>
        <p>Kigali&apos;s local marketplace for food, everyday shopping, and parcel delivery.</p>
        <span><MapPin /> {business.businessAddress}</span>
      </div>

      <nav aria-label="Customer services">
        <b>Services</b>
        <Link href="/explore">Explore</Link>
        <Link href="/restaurants">Restaurants</Link>
        <Link href="/markets">Markets</Link>
        <Link href="/customer/orders">Track orders</Link>
        <Link href="/customer/parcels/new">Send a parcel</Link>
        <Link href="/customer/parcels">Track parcels</Link>
      </nav>

      <nav aria-label="Company information">
        <b>{business.businessName}</b>
        <Link href="/about">About us</Link>
        <Link href="/contact">Contact us</Link>
        <Link href="/help">Help center</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms &amp; conditions</Link>
      </nav>

      <address>
        <b>Contact</b>
        <a href={phoneHref(business.supportPhone)}><Phone /> {phoneDisplay(business.supportPhone)}</a>
        <a href={whatsappHref(business.whatsappNumber, business.businessName)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp support</a>
        <a href={mailHref(business.supportEmail)}><Mail /> {business.supportEmail}</a>
        {business.instagramUrl && <a href={business.instagramUrl} target="_blank" rel="noreferrer"><Camera /> Instagram</a>}
      </address>

      <small>© {new Date().getFullYear()} {business.businessName} · Made in Rwanda</small>
    </footer>
  );
}

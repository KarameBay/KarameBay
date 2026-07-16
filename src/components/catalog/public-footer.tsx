import Link from "next/link";
import { Camera, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_E164,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/contact";

const INSTAGRAM_URL =
  "https://www.instagram.com/karame_transport_delivery?igsh=bHh4Mjdya2M2c2lp";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-brand">
        <Link href="/" aria-label="Karame Bay home">
          Karame<span>Bay</span>
        </Link>
        <p>
          Kigali&apos;s local marketplace for food, everyday shopping, and
          parcel delivery.
        </p>
        <span><MapPin /> Serving Kigali, Rwanda</span>
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
        <b>Karame Bay</b>
        <Link href="/about">About us</Link>
        <Link href="/contact">Contact us</Link>
      </nav>

      <address>
        <b>Contact</b>
        <a href={`tel:${SUPPORT_PHONE_E164}`}><Phone /> {SUPPORT_PHONE_DISPLAY}</a>
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">
          <MessageCircle /> WhatsApp support
        </a>
        <a href="tel:+250791889095"><Phone /> 079 188 9095</a>
        <a href="mailto:karamebay3@gmail.com"><Mail /> karamebay3@gmail.com</a>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
          <Camera /> Instagram
        </a>
      </address>

      <small>© 2026 Karame Bay · Made in Rwanda</small>
    </footer>
  );
}

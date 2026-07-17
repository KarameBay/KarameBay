import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { requireRole } from "@/lib/auth/session";
import { getBusinessProfile } from "@/lib/business-profile";
import { mailHref, phoneDisplay, phoneHref, whatsappHref } from "@/lib/contact";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireRole("CUSTOMER");
  const business = await getBusinessProfile();
  return <><BrowseHeader /><CustomerPortalShell active="help" title="Help & Support" description={`Get help from ${business.businessName}.`}><header><div><span className="catalog-kicker">CUSTOMER SUPPORT</span><h1>How can we help?</h1><p>{business.businessHours} · {business.businessAddress}</p></div></header><section className="customer-help-grid"><a href={phoneHref(business.supportPhone)}><Phone /><b>Call support</b><span>{phoneDisplay(business.supportPhone)}</span></a><a href={whatsappHref(business.whatsappNumber, business.businessName)} target="_blank" rel="noreferrer"><MessageCircle /><b>WhatsApp</b><span>{phoneDisplay(business.whatsappNumber)}</span></a><a href={mailHref(business.supportEmail)}><Mail /><b>Email support</b><span>{business.supportEmail}</span></a></section><nav className="customer-help-links"><Link href="/contact">Contact support</Link><Link href="/faq">FAQ</Link><Link href="/customer/reviews">My reviews</Link><Link href="/contact#report-issue">Report an issue</Link><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms &amp; conditions</Link><Link href="/delivery-policy">Delivery policy</Link><Link href="/refund-policy">Refund policy</Link><Link href="/parcel-policy">Parcel delivery policy</Link><Link href="/prohibited-parcel-items">Prohibited parcel items</Link></nav></CustomerPortalShell></>;
}

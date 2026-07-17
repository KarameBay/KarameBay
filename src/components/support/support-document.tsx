import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { PublicFooter } from "@/components/catalog/public-footer";
import { getBusinessProfile } from "@/lib/business-profile";
import { mailHref, phoneDisplay, phoneHref, whatsappHref } from "@/lib/contact";

export type SupportSection = { title: string; paragraphs: string[]; bullets?: string[] };

export async function SupportDocument({
  kicker,
  title,
  summary,
  sections,
}: {
  kicker: string;
  title: string;
  summary: string;
  sections: SupportSection[];
}) {
  const business = await getBusinessProfile();
  return (
    <div className="app-shell support-shell">
      <BrowseHeader />
      <main className="support-page">
        <header className="support-hero">
          <span className="catalog-kicker">{kicker}</span>
          <h1>{title}</h1>
          <p>{summary.replaceAll("{business}", business.businessName)}</p>
        </header>
        <div className="support-layout">
          <article className="support-document">
            {sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title.replaceAll("{business}", business.businessName)}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph.replaceAll("{business}", business.businessName)}</p>)}
                {section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item.replaceAll("{business}", business.businessName)}</li>)}</ul>}
              </section>
            ))}
          </article>
          <aside className="support-contact-card">
            <span className="catalog-kicker">CONTACT SUPPORT</span>
            <h2>{business.businessName}</h2>
            <a href={phoneHref(business.supportPhone)}><Phone /> <span><small>Call</small><b>{phoneDisplay(business.supportPhone)}</b></span></a>
            <a href={whatsappHref(business.whatsappNumber, business.businessName)} target="_blank" rel="noreferrer"><MessageCircle /> <span><small>WhatsApp</small><b>{phoneDisplay(business.whatsappNumber)}</b></span></a>
            <a href={mailHref(business.supportEmail)}><Mail /> <span><small>Email</small><b>{business.supportEmail}</b></span></a>
            <p><MapPin /> {business.businessAddress}</p>
            <p>{business.businessHours}</p>
            <Link href="/contact">Contact us</Link>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

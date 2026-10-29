import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPartnerWorkspace } from "@/lib/partner";
import { LogoutButton } from "@/components/logout-button";
import { PartnerWorkspace } from "@/components/partner/partner-workspace";
import { PartnerOrders } from "@/components/partner/partner-orders";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Partner workspace",
  robots: { index: false, follow: false },
};
export default async function PartnerPage() {
  const user = await requireRole("PARTNER");
  const workspace = await getPartnerWorkspace(user.id);
  return (
    <main className="partner-page">
      <header className="partner-header">
        <Link className="partner-brand" href="/">
          Karame<b>Bay</b>
        </Link>
        <nav aria-label="Partner account">
          <Link href="/explore">Marketplace</Link>
          <LogoutButton role="PARTNER" destination="/partner/login" />
        </nav>
      </header>
      <section className="partner-welcome">
        <span className="catalog-kicker">PARTNER WORKSPACE</span>
        <h1>Hello, {user.firstName}.</h1>
        <p>Your shop, your products. Reach more customers with Karame Bay.</p>
      </section>
      <PartnerOrders />
      <PartnerWorkspace {...workspace} />
    </main>
  );
}

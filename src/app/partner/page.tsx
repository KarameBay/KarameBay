import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPartnerWorkspace } from "@/lib/partner";
import { LogoutButton } from "@/components/logout-button";
import { PartnerWorkspace } from "@/components/partner/partner-workspace";
import { PartnerOrders } from "@/components/partner/partner-orders";
import { AdminRestaurantMenuBuilder } from "@/components/admin/admin-restaurant-menu-builder";
import { getRestaurantMenuBuilderStores } from "@/lib/restaurant-menu";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Partner workspace",
  robots: { index: false, follow: false },
};
export default async function PartnerPage() {
  const user = await requireRole("PARTNER");
  const [workspace, restaurantMenuStores] = await Promise.all([
    getPartnerWorkspace(user.id),
    getRestaurantMenuBuilderStores(user.id),
  ]);
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
      <nav className="partner-quick-nav" aria-label="Partner workspace sections">
        <a href="#partner-orders">Orders</a>
        <a href="#partner-catalog">Catalog</a>
        {restaurantMenuStores.length > 0 && <a href="#partner-menu-builder">Menu builder</a>}
      </nav>
      <div id="partner-orders"><PartnerOrders /></div>
      <section id="partner-catalog" className="partner-workspace-section"><PartnerWorkspace {...workspace} /></section>
      {restaurantMenuStores.length > 0 && (
        <section id="partner-menu-builder" className="partner-menu-builder">
          <div className="partner-toolbar">
            <div>
              <span className="catalog-kicker">RESTAURANT MENU BUILDER</span>
              <h2>Build your restaurant menu</h2>
              <p>
                Add categories, menu items, variants, choices, and add-ons. Admin reviews changes before they appear live.
              </p>
            </div>
          </div>
          <AdminRestaurantMenuBuilder
            stores={restaurantMenuStores}
            apiPath="/api/admin/restaurant-menu"
            imageUploadEndpoint="/api/partner/uploads/images"
          />
        </section>
      )}
    </main>
  );
}

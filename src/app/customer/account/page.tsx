import Link from "next/link";
import { Bell, LifeBuoy, MapPin, Package, Settings, ShieldUser, ShoppingBag, Star, UserRound } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getBusinessProfile } from "@/lib/business-profile";

export const dynamic = "force-dynamic";

const tiles = [
  { href: "/customer/profile", label: "Profile", icon: UserRound, note: "Your personal details" },
  { href: "/customer/settings", label: "Settings", icon: Settings, note: "Account preferences" },
  { href: "/customer/addresses", label: "Saved addresses", icon: MapPin, note: "Home, work, and other places" },
  { href: "/customer/orders", label: "Orders", icon: ShoppingBag, note: "Track store deliveries" },
  { href: "/customer/parcels", label: "Parcels", icon: Package, note: "Send and follow packages" },
  { href: "/customer/notifications", label: "Notifications", icon: Bell, note: "See order and parcel delivery updates." },
  { href: "/customer/reviews", label: "Reviews", icon: Star, note: "Your recent ratings" },
  { href: "/customer/help", label: "Support", icon: LifeBuoy, note: "Help and service policies" },
];

export default async function CustomerAccountPage() {
  const user = await requireRole("CUSTOMER");
  const [business, orders, parcels, addresses, unreadOrderNotifications, unreadParcelNotifications] = await Promise.all([
    getBusinessProfile(),
    db.order.count({ where: { customerId: user.id } }),
    db.parcelDelivery.count({ where: { customerId: user.id } }),
    db.address.count({ where: { userId: user.id } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.parcelNotification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const unreadNotifications = unreadOrderNotifications + unreadParcelNotifications;

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="account"
        title={`Welcome back, ${user.firstName}`}
        description="This is your customer space for orders, parcel deliveries, saved addresses, settings, and notifications."
      >
        <section className="customer-account-hero">
          <span className="catalog-kicker">CUSTOMER PORTAL</span>
          <h2>Quick snapshot</h2>
          <p><b>{user.email}</b> · {user.emailVerifiedAt ? "Email verified" : "Email unverified"}<br />{user.phone}</p>
          <div className="customer-account-stats parcel-aware">
            <article>
              <strong>{orders}</strong>
              <span>Total orders</span>
            </article>
            <article>
              <strong>{parcels}</strong>
              <span>Parcel deliveries</span>
            </article>
            <article>
              <strong>{addresses}</strong>
              <span>Saved addresses</span>
            </article>
            <article>
              <strong>{unreadNotifications}</strong>
              <span>Unread notifications</span>
            </article>
          </div>
        </section>
        <section className="customer-account-grid">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.href} href={tile.href} className="customer-account-card">
                <span>
                  <Icon />
                </span>
                <div>
                  <b>{tile.label}</b>
                  <small>{tile.note}</small>
                </div>
              </Link>
            );
          })}
        </section>
        <section className="customer-account-footer">
          <div>
            <ShieldUser />
            <div>
              <b>Help and support</b>
              <p>
                Need help? Contact {business.businessName} support or call the delivery
                team.
              </p>
            </div>
          </div>
          <Link href="/customer/help">Open Help &amp; Support</Link>
        </section>
      </CustomerPortalShell>
    </>
  );
}

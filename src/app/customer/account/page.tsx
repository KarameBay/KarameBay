import Link from "next/link";
import { Bell, MapPin, Package, Settings, ShieldUser, ShoppingBag, UserRound } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const tiles = [
  { href: "/customer/profile", label: "My Profile", icon: UserRound, note: "View your name, email, and phone." },
  { href: "/customer/settings", label: "Account Settings", icon: Settings, note: "Update account preferences." },
  { href: "/customer/addresses", label: "Saved Addresses", icon: MapPin, note: "Manage Home, Work, and Other." },
  { href: "/customer/orders", label: "My Orders", icon: ShoppingBag, note: "Track your deliveries and history." },
  { href: "/customer/parcels", label: "My Parcel Deliveries", icon: Package, note: "Send packages and follow each handover." },
  { href: "/customer/notifications", label: "Notifications", icon: Bell, note: "See order and parcel delivery updates." },
];

export default async function CustomerAccountPage() {
  const user = await requireRole("CUSTOMER");
  const [orders, parcels, addresses, unreadOrderNotifications, unreadParcelNotifications] = await Promise.all([
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
                Need help? Contact Karame Bay support or call the delivery
                team.
              </p>
            </div>
          </div>
          <Link href="/contact">Contact support</Link>
        </section>
      </CustomerPortalShell>
    </>
  );
}

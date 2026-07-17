import Link from "next/link";
import {
  Bell,
  MapPin,
  Package,
  LifeBuoy,
  Settings,
  ShoppingBag,
  Star,
  UserRound,
} from "lucide-react";
import { CustomerAccountActions } from "@/components/customer/customer-account-actions";
import type { ComponentType, ReactNode } from "react";

type PortalTab =
  | "account"
  | "profile"
  | "settings"
  | "addresses"
  | "orders"
  | "parcels"
  | "reviews"
  | "help"
  | "notifications";

const navItems: {
  href: string;
  label: string;
  note: string;
  icon: ComponentType<{ className?: string }>;
  tab: PortalTab;
}[] = [
  {
    href: "/customer/account",
    label: "Overview",
    note: "Account hub",
    icon: UserRound,
    tab: "account",
  },
  {
    href: "/customer/orders",
    label: "My orders",
    note: "Track deliveries",
    icon: ShoppingBag,
    tab: "orders",
  },
  {
    href: "/customer/parcels",
    label: "My parcels",
    note: "Send and track packages",
    icon: Package,
    tab: "parcels",
  },
  {
    href: "/customer/reviews",
    label: "My reviews",
    note: "Ratings and feedback",
    icon: Star,
    tab: "reviews",
  },
  {
    href: "/customer/help",
    label: "Help & Support",
    note: "Contact and policies",
    icon: LifeBuoy,
    tab: "help",
  },
  {
    href: "/customer/profile",
    label: "My profile",
    note: "Personal details",
    icon: UserRound,
    tab: "profile",
  },
  {
    href: "/customer/settings",
    label: "Settings",
    note: "Preferences",
    icon: Settings,
    tab: "settings",
  },
  {
    href: "/customer/addresses",
    label: "Addresses",
    note: "Home and work",
    icon: MapPin,
    tab: "addresses",
  },
  {
    href: "/customer/notifications",
    label: "Notifications",
    note: "Order updates",
    icon: Bell,
    tab: "notifications",
  },
];

export function CustomerPortalShell({
  active,
  title,
  description,
  children,
}: {
  active: PortalTab;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="customer-portal-shell">
      <aside className="customer-portal-sidebar">
        <span className="catalog-kicker">CUSTOMER PORTAL</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <nav className="customer-portal-nav" aria-label="Customer sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active === item.tab ? "active" : ""}
              >
                <Icon />
                <span>
                  <b>{item.label}</b>
                  <small>{item.note}</small>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="customer-portal-sidebar-card">
          <small>NEED HELP?</small>
          <b>Use this portal for all customer tasks.</b>
          <p>Orders, parcels, saved addresses, settings, and notifications stay here.</p>
        </div>
        <div className="customer-portal-sidebar-actions">
          <Link href="/customer/parcels/new">Send a parcel</Link>
          <Link href="/stores">Browse stores</Link>
          <CustomerAccountActions />
        </div>
      </aside>
      <section className="customer-portal-content">{children}</section>
    </main>
  );
}

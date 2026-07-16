"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Compass,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Package,
  ShoppingBag,
  Store,
  User,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { DELIVERY_ADDRESS_KEY } from "@/lib/delivery";

const primaryLinks = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/explore", label: "Explore", icon: Compass, exact: true },
  { href: "/restaurants", label: "Restaurants", icon: Utensils, exact: false },
  { href: "/markets", label: "Markets", icon: Store, exact: false },
  {
    href: "/customer/parcels/new",
    label: "Send a Parcel",
    icon: Package,
    exact: false,
  },
] as const;

function isCurrentPath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BrowseHeaderClient({ signedIn }: { signedIn: boolean }) {
  const { itemCount, hydrated } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const [deliveryLabel, setDeliveryLabel] = useState("Choose location");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const address = localStorage.getItem(DELIVERY_ADDRESS_KEY);
    if (address) {
      queueMicrotask(() =>
        setDeliveryLabel(address.split(",").slice(0, 2).join(",")),
      );
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "CUSTOMER" }),
      });
      setMenuOpen(false);
      router.replace("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="browse-header customer-site-header">
      <div className="browse-header-inner">
        <Link href="/" className="browse-logo" aria-label="Karame Bay home">
          <Image
            src="/images/karame-transport-logo.jpeg"
            width={44}
            height={44}
            sizes="44px"
            priority
            alt="Karame Bay"
          />
          <span>
            Karame<b>Bay</b>
          </span>
        </Link>

        <Link className="header-location header-location-desktop" href="/checkout/delivery">
          <MapPin aria-hidden="true" />
          <span>
            <small>DELIVERING TO</small>
            <strong>{deliveryLabel}</strong>
          </span>
        </Link>

        <nav className="browse-primary-nav" aria-label="Main navigation">
          {primaryLinks.map(({ href, label, exact }) => (
            <Link
              key={href}
              className={isCurrentPath(pathname, href, exact) ? "active" : ""}
              href={href}
              aria-current={isCurrentPath(pathname, href, exact) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="browse-header-actions">
          <Link
            className={`header-text-action ${pathname.startsWith("/customer/orders") ? "active" : ""}`}
            href="/customer/orders"
          >
            Orders
          </Link>
          {signedIn && (
            <NotificationBell
              className="customer-header-notifications"
              href="/customer/notifications"
              portal="customer"
            />
          )}
          <Link className="header-account" href="/customer/account">
            <User aria-hidden="true" />
            <span>Account</span>
          </Link>
          <Link className="header-cart" href="/cart" aria-label={`Basket${hydrated && itemCount ? `, ${itemCount} items` : ""}`}>
            <ShoppingBag aria-hidden="true" />
            <span>Basket</span>
            {hydrated && itemCount > 0 && <em>{itemCount}</em>}
          </Link>
          {signedIn ? (
            <button
              type="button"
              className="header-session-action"
              onClick={() => void signOut()}
              disabled={loggingOut}
            >
              <LogOut aria-hidden="true" />
              {loggingOut ? "Signing out" : "Sign out"}
            </button>
          ) : (
            <Link className="header-session-action" href="/customer/login">
              <LogIn aria-hidden="true" /> Sign in
            </Link>
          )}
          <button
            type="button"
            className="header-menu-toggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls={menuId}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="customer-mobile-menu-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav id={menuId} className="customer-mobile-menu" aria-label="Mobile navigation">
            <Link
              className="mobile-delivery-location"
              href="/checkout/delivery"
              onClick={() => setMenuOpen(false)}
            >
              <MapPin aria-hidden="true" />
              <span>
                <small>DELIVERING TO</small>
                <strong>{deliveryLabel}</strong>
              </span>
            </Link>

            <div className="customer-mobile-primary-links">
              {primaryLinks.map(({ href, label, icon: Icon, exact }) => (
                <Link
                  key={href}
                  className={isCurrentPath(pathname, href, exact) ? "active" : ""}
                  href={href}
                  aria-current={isCurrentPath(pathname, href, exact) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon aria-hidden="true" /> {label}
                </Link>
              ))}
            </div>

            <div className="customer-mobile-account-links">
              <Link href="/customer/orders" onClick={() => setMenuOpen(false)}>
                <ClipboardList aria-hidden="true" /> Orders
              </Link>
              {signedIn && (
                <Link href="/customer/notifications" onClick={() => setMenuOpen(false)}>
                  <NotificationBellIcon /> Notifications
                </Link>
              )}
              <Link href="/customer/account" onClick={() => setMenuOpen(false)}>
                <User aria-hidden="true" /> Account
              </Link>
              {signedIn ? (
                <button type="button" onClick={() => void signOut()} disabled={loggingOut}>
                  <LogOut aria-hidden="true" />
                  {loggingOut ? "Signing out" : "Sign out"}
                </button>
              ) : (
                <Link href="/customer/login" onClick={() => setMenuOpen(false)}>
                  <LogIn aria-hidden="true" /> Sign in
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}

function NotificationBellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

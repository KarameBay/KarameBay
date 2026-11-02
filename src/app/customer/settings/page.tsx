import Link from "next/link";
import { Bell, MapPin, UserRound } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerSettingsPage() {
  const user = await requireRole("CUSTOMER");

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="settings"
        title="Account settings"
        description="Find your profile, saved addresses, and account updates."
      >
        <section className="customer-summary-card customer-settings-card">
          <span className="catalog-kicker">ACCOUNT SETTINGS</span>
          <h2>Manage your account, {user.firstName}</h2>
          <p>Choose what you want to update or review.</p>
          <div className="customer-settings-grid">
            <Link href="/customer/profile"><UserRound /><span><b>Profile and contact</b><small>Update your name, email, phone, or photo</small></span></Link>
            <Link href="/customer/addresses"><MapPin /><span><b>Delivery addresses</b><small>See the Kigali places you have saved</small></span></Link>
            <Link href="/customer/notifications"><Bell /><span><b>Notifications</b><small>Read order and parcel updates</small></span></Link>
          </div>
        </section>
      </CustomerPortalShell>
    </>
  );
}

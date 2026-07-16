import Link from "next/link";
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
        description="Control your profile and notification preferences here."
      >
        <section className="customer-summary-card">
          <span className="catalog-kicker">ACCOUNT SETTINGS</span>
          <h2>Settings for {user.firstName}</h2>
          <p>
            This area is ready for profile and notification preferences in the
            next step.
          </p>
          <div className="role-actions">
            <Link href="/customer/account">Back to account</Link>
            <Link href="/customer/addresses">Manage addresses</Link>
          </div>
        </section>
      </CustomerPortalShell>
    </>
  );
}

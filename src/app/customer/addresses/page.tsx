import Link from "next/link";
import { MapPin } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CustomerAddressesPage() {
  const user = await requireRole("CUSTOMER");
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="addresses"
        title="Delivery addresses"
        description="Use saved locations for faster checkout and delivery."
      >
        <section className="customer-address-list customer-portal-stack">
          {addresses.length ? (
            addresses.map((address) => (
              <article key={address.id}>
                <h2>
                  <MapPin /> {address.label}
                </h2>
                <p>{address.address}</p>
                <small>{address.details}</small>
              </article>
            ))
          ) : (
            <div className="customer-no-orders">
              <h2>No saved addresses yet</h2>
              <p>Use the delivery map to save Home, Work, or Other.</p>
            </div>
          )}
        </section>
        <div className="role-actions">
          <Link href="/checkout/delivery">Add or confirm location</Link>
          <Link href="/customer/account">Back to account</Link>
        </div>
      </CustomerPortalShell>
    </>
  );
}

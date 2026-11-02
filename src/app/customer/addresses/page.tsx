import { MapPin } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { AddressActions } from "@/components/customer/address-actions";
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
        <div className="customer-address-heading">
          <div>
            <span className="catalog-kicker">YOUR PLACES</span>
            <h2>Saved addresses</h2>
            <p>{addresses.length} {addresses.length === 1 ? "address" : "addresses"} in your account</p>
          </div>
          <AddressActions />
        </div>
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
              <p>Save a Kigali address while choosing delivery for your next order.</p>
            </div>
          )}
        </section>
      </CustomerPortalShell>
    </>
  );
}

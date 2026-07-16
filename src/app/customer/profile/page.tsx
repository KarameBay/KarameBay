import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { CustomerProfileForm } from "@/components/customer/customer-profile-form";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const user = await requireRole("CUSTOMER");

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="profile"
        title="My profile"
        description="Review the details attached to your customer account."
      >
        <section className="customer-summary-card">
          <span className="catalog-kicker">MY PROFILE</span>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p>Update the contact details used for delivery communication.</p>
          <CustomerProfileForm user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, emailVerified: Boolean(user.emailVerifiedAt), profilePhotoUrl: user.profilePhotoUrl }} />
        </section>
      </CustomerPortalShell>
    </>
  );
}

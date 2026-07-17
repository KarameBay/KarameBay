import { BrowseHeader } from "@/components/catalog/browse-header";
import { ParcelTrackingClient } from "@/components/parcel/parcel-tracking-client";
import { requireRole } from "@/lib/auth/session";
import { getBusinessProfile } from "@/lib/business-profile";
import { whatsappHref } from "@/lib/contact";

export const dynamic = "force-dynamic";

export default async function ParcelTrackingPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await requireRole("CUSTOMER");
  const [{ reference }, business] = await Promise.all([params, getBusinessProfile()]);
  return (
    <>
      <BrowseHeader />
      <ParcelTrackingClient reference={reference} whatsappUrl={whatsappHref(business.whatsappNumber, business.businessName)} />
    </>
  );
}

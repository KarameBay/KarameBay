import { BrowseHeader } from "@/components/catalog/browse-header";
import { ParcelTrackingClient } from "@/components/parcel/parcel-tracking-client";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ParcelTrackingPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await requireRole("CUSTOMER");
  const { reference } = await params;
  return (
    <>
      <BrowseHeader />
      <ParcelTrackingClient reference={reference} />
    </>
  );
}


import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import {
  CustomerParcelList,
  type CustomerParcelListItem,
} from "@/components/parcel/customer-parcel-list";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CustomerParcelsPage() {
  const customer = await requireRole("CUSTOMER");
  const rows = await db.parcelDelivery.findMany({
    where: { customerId: customer.id },
    select: {
      referenceNumber: true,
      status: true,
      pickupAddress: true,
      pickupAddressDetails: true,
      deliveryAddress: true,
      deliveryAddressDetails: true,
      recipientName: true,
      categoryName: true,
      sizeName: true,
      totalRwf: true,
      createdAt: true,
      payment: { select: { status: true } },
      assignedRider: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const parcels: CustomerParcelListItem[] = rows.map((row) => ({
    referenceNumber: row.referenceNumber,
    status: row.status,
    pickupAddress: row.pickupAddress,
    pickupAddressDetails: row.pickupAddressDetails,
    deliveryAddress: row.deliveryAddress,
    deliveryAddressDetails: row.deliveryAddressDetails,
    recipientName: row.recipientName,
    categoryName: row.categoryName,
    sizeName: row.sizeName,
    totalRwf: row.totalRwf,
    createdAt: row.createdAt.toISOString(),
    paymentStatus: row.payment?.status ?? "PENDING_PAYMENT",
    riderName: row.assignedRider
      ? `${row.assignedRider.firstName} ${row.assignedRider.lastName}`.trim()
      : null,
  }));

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="parcels"
        title="My parcel deliveries"
        description="Book a package delivery, follow its route, and review previous parcel requests."
      >
        <CustomerParcelList initialParcels={parcels} />
      </CustomerPortalShell>
    </>
  );
}


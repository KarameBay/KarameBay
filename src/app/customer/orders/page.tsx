import { BrowseHeader } from "@/components/catalog/browse-header";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { CustomerOrdersList } from "@/components/orders/customer-orders-list";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const user = await requireRole("CUSTOMER");
  const orders = await db.order.findMany({
    where: { customerId: user.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotalRwf: true,
      createdAt: true,
      store: { select: { name: true } },
      payment: { select: { status: true } },
      review: { select: { id: true, editableUntil: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell
        active="orders"
        title="My orders"
        description="Track your current orders and review previous deliveries."
      >
        <CustomerOrdersList initialOrders={orders.map((order) => ({
          ...order,
          createdAt: order.createdAt.toISOString(),
          review: order.review ? {
            id: order.review.id,
            editableUntil: order.review.editableUntil?.toISOString() ?? null,
          } : null,
        }))} />
      </CustomerPortalShell>
    </>
  );
}

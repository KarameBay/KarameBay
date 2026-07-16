import Link from "next/link";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { formatRwf } from "@/lib/catalog";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";

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
        <header>
          <div>
            <span className="catalog-kicker">MY KARAME BAY</span>
            <h1>My orders</h1>
            <p>Track your current orders and review previous deliveries.</p>
          </div>
          <div>
            <Link href="/customer/account">Account</Link>
            <Link href="/stores">Browse stores</Link>
          </div>
        </header>
        <section>
          {orders.length ? (
            orders.map((order) => (
              <article key={order.id}>
                <div>
                  <small>{order.orderNumber}</small>
                  <h2>{order.store.name}</h2>
                  <p>
                    {order.createdAt.toLocaleString("en-RW", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div>
                  <span className="customer-status">
                    {orderStatusLabel(order.status)}
                  </span>
                  <small>
                    {paymentStatusLabel(order.payment?.status ?? "UNKNOWN")}
                  </small>
                </div>
                <b>{formatRwf(order.grandTotalRwf)}</b>
                <Link href={`/orders/${order.orderNumber}/track`}>
                  Track order
                </Link>
              </article>
            ))
          ) : (
            <div className="customer-no-orders">
              <h2>No orders yet</h2>
              <p>Your orders will appear here after checkout.</p>
              <Link href="/stores">Start shopping</Link>
            </div>
          )}
        </section>
      </CustomerPortalShell>
    </>
  );
}

import Link from "next/link";
import { Clock3, MapPin, PackageCheck, ShieldCheck, Store } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatRwf } from "@/lib/catalog";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user) redirect("/customer/login");
  const { orderNumber } = await params;
  const order = await db.order.findFirst({
    where: {
      orderNumber,
      ...(user.role === "ADMIN" ? {} : { customerId: user.id }),
    },
    include: { store: true, payment: true, items: true },
  });
  if (!order) notFound();
  return (
    <>
      <BrowseHeader />
      <main className="order-success">
        <span className="order-success-icon">
          <PackageCheck />
        </span>
        <span className="catalog-kicker">ORDER DETAILS</span>
        <h1>Order {order.orderNumber}</h1>
        <p>
          {order.status === "DELIVERED"
            ? "Your order has been delivered. Thank you for shopping with Karame Bay."
            : order.status === "CANCELLED" || order.status === "REJECTED"
              ? "This order is no longer in progress. Open tracking for its latest updates."
              : "Open tracking to see the latest updates on your order."}
        </p>
        <div className="order-success-grid">
          <div>
            <PackageCheck />
            <span>
              <small>ORDER STATUS</small>
              <b>{orderStatusLabel(order.status)}</b>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <small>PAYMENT STATUS</small>
              <b>{paymentStatusLabel(order.payment?.status ?? "UNKNOWN")}</b>
            </span>
          </div>
          <div>
            <Clock3 />
            <span>
              <small>DRIVING TIME</small>
              <b>{Math.ceil(order.estimatedDurationS / 60)} min travel</b>
            </span>
          </div>
        </div>
        <div className="order-success-actions">
          <Link href={`/orders/${order.orderNumber}/track`}>Track order</Link>
          <Link href="/stores">Continue shopping</Link>
        </div>
        <section className="order-success-details" aria-labelledby="order-items-heading">
          <div className="order-success-destination">
            <span><Store aria-hidden="true" /><b>{order.store.name}</b></span>
            <span><MapPin aria-hidden="true" /><b>{order.deliveryAddress}</b></span>
          </div>
          <h2 id="order-items-heading">Your items</h2>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                <span>
                  <b>{item.quantity} × {item.productName}</b>
                  {item.variantName && <small>{item.variantName}</small>}
                </span>
                <strong>{formatRwf(item.lineTotalRwf)}</strong>
              </li>
            ))}
          </ul>
          {order.ebmRequested && <p>EBM receipt requested for this order.</p>}
        </section>
        <div className="order-success-costs">
          <span>Items subtotal <b>{formatRwf(order.itemsSubtotalRwf)}</b></span>
          <span>Delivery fee <b>{formatRwf(order.deliveryFeeRwf)}</b></span>
        </div>
        <div className="order-success-total">
          <span>Grand total</span>
          <b>{formatRwf(order.grandTotalRwf)}</b>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { Check, Clock3, PackageCheck, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatRwf } from "@/lib/catalog";

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
          <Check />
        </span>
        <span className="catalog-kicker">ORDER SUBMITTED</span>
        <h1>Thank you, {user.firstName}!</h1>
        <p>
          Your order is waiting for payment verification. We&apos;ll notify you
          when it moves forward.
        </p>
        <div className="order-reference">
          <small>ORDER NUMBER</small>
          <b>{order.orderNumber}</b>
        </div>
        <div className="order-success-grid">
          <div>
            <PackageCheck />
            <span>
              <small>ORDER STATUS</small>
              <b>{order.status}</b>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <small>PAYMENT STATUS</small>
              <b>{order.payment?.status.replaceAll("_", " ")}</b>
            </span>
          </div>
          <div>
            <Clock3 />
            <span>
              <small>ESTIMATED DELIVERY</small>
              <b>{Math.ceil(order.estimatedDurationS / 60)} min travel</b>
            </span>
          </div>
        </div>
        <div className="order-success-total">
          <span>Grand total</span>
          <b>{formatRwf(order.grandTotalRwf)}</b>
        </div>
        <div className="order-success-actions">
          <Link href={`/orders/${order.orderNumber}/track`}>Track order</Link>
          <Link href="/stores">Continue shopping</Link>
        </div>
      </main>
    </>
  );
}

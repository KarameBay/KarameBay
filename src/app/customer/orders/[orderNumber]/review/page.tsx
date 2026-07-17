import Link from "next/link";
import { notFound } from "next/navigation";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerReviewForm } from "@/components/reviews/customer-review-form";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ orderNumber: string }> }) {
  const customer = await requireRole("CUSTOMER");
  const { orderNumber } = await params;
  const order = await db.order.findFirst({
    where: { orderNumber, customerId: customer.id },
    select: {
      orderNumber: true, status: true,
      store: { select: { name: true } },
      rider: { select: { firstName: true, lastName: true } },
      review: true,
    },
  });
  if (!order) notFound();
  const editable = order.review && order.review.editableUntil > new Date();
  const initial = order.review ? {
    storeRating: order.review.storeRating,
    writtenReview: order.review.writtenReview ?? "",
    foodQualityRating: order.review.foodQualityRating,
    packagingRating: order.review.packagingRating,
    orderAccuracyRating: order.review.orderAccuracyRating,
    riderOverallRating: order.review.riderOverallRating,
    friendlinessRating: order.review.friendlinessRating,
    deliverySpeedRating: order.review.deliverySpeedRating,
    professionalismRating: order.review.professionalismRating,
    riderComment: order.review.riderComment ?? "",
  } : undefined;
  return <><BrowseHeader /><main className="customer-rating-page"><Link href="/customer/orders">← Back to my orders</Link><header><span className="catalog-kicker">VERIFIED ORDER · {order.orderNumber}</span><h1>Rate your experience</h1><p>Reviews help customers, stores, riders, and the Karame team improve.</p></header>{order.status !== "DELIVERED" ? <section className="review-unavailable"><h2>Review not available yet</h2><p>You can review this order after it is delivered.</p></section> : order.review && !editable ? <section className="review-unavailable"><h2>Your review is complete</h2><p>The 24-hour editing window has ended.</p><Link href="/customer/reviews">View my reviews</Link></section> : <CustomerReviewForm orderNumber={order.orderNumber} storeName={order.store.name} riderName={order.rider ? `${order.rider.firstName} ${order.rider.lastName}` : null} reviewId={order.review?.id} initial={initial} />}</main></>;
}

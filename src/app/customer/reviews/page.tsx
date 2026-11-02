import Link from "next/link";
import { Star } from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reviewStatusLabel } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export default async function Page() {
  const customer = await requireRole("CUSTOMER");
  const [readyOrders, reviews] = await Promise.all([
    db.order.findMany({
      where: { customerId: customer.id, status: "DELIVERED", review: null },
      select: { orderNumber: true, store: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.review.findMany({
      where: { customerId: customer.id },
      include: {
        store: { select: { name: true } },
        order: { select: { orderNumber: true } },
        rider: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const now = new Date();

  return (
    <>
      <BrowseHeader />
      <CustomerPortalShell active="reviews" title="My reviews" description="Your verified order feedback.">
        <header>
          <div>
            <span className="catalog-kicker">MY FEEDBACK</span>
            <h1>My reviews</h1>
            <p>Reviews can be edited for 24 hours after submission.</p>
          </div>
          <Link href="/customer/orders">My orders</Link>
        </header>
        {readyOrders.length > 0 && (
          <section className="reviews-ready-section" aria-labelledby="reviews-ready-heading">
            <div>
              <h2 id="reviews-ready-heading">Ready to review</h2>
              <p>Share feedback on a delivered order.</p>
            </div>
            <div className="reviews-ready-list">
              {readyOrders.map((order) => (
                <article key={order.orderNumber}>
                  <div>
                    <small>{order.orderNumber}</small>
                    <h3>{order.store.name}</h3>
                  </div>
                  <Link href={`/customer/orders/${order.orderNumber}/review`}>Rate order</Link>
                </article>
              ))}
            </div>
          </section>
        )}
        <section className="my-reviews-list" aria-label="Submitted reviews">
          {reviews.length ? reviews.map((review) => (
            <article key={review.id}>
              <div>
                <small>{review.order.orderNumber} · {reviewStatusLabel(review.moderationStatus)}</small>
                <h2>{review.store.name}</h2>
                <span className="review-stars" aria-label={`${review.storeRating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} className={value <= review.storeRating ? "filled" : ""} />
                  ))}
                </span>
                {review.writtenReview && <p>{review.writtenReview}</p>}
                {review.riderOverallRating && (
                  <small>Rider: {review.rider?.firstName} {review.rider?.lastName} · {review.riderOverallRating}/5</small>
                )}
                {review.adminReply && (
                  <blockquote><b>Response from Karame Bay</b>{review.adminReply}</blockquote>
                )}
              </div>
              {review.editableUntil > now && (
                <Link href={`/customer/orders/${review.order.orderNumber}/review`}>Edit review</Link>
              )}
            </article>
          )) : !readyOrders.length && (
            <div className="review-unavailable">
              <h2>No reviews yet</h2>
              <p>Delivered orders will offer a review option.</p>
              <Link href="/customer/orders">Open my orders</Link>
            </div>
          )}
        </section>
      </CustomerPortalShell>
    </>
  );
}

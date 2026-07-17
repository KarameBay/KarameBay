"use client";

import { LoaderCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type RatingKey = "storeRating" | "foodQualityRating" | "packagingRating" | "orderAccuracyRating" | "riderOverallRating" | "friendlinessRating" | "deliverySpeedRating" | "professionalismRating";
type ReviewValues = Record<RatingKey, number | null> & { writtenReview: string; riderComment: string };

const empty: ReviewValues = {
  storeRating: null, foodQualityRating: null, packagingRating: null,
  orderAccuracyRating: null, riderOverallRating: null, friendlinessRating: null,
  deliverySpeedRating: null, professionalismRating: null, writtenReview: "", riderComment: "",
};

export function CustomerReviewForm({
  orderNumber,
  storeName,
  riderName,
  reviewId,
  initial,
}: {
  orderNumber: string;
  storeName: string;
  riderName: string | null;
  reviewId?: string;
  initial?: Partial<ReviewValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ReviewValues>({ ...empty, ...initial });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  function setRating(key: RatingKey, value: number) {
    setValues((current) => ({ ...current, [key]: current[key] === value && key !== "storeRating" ? null : value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values.storeRating) { setMessage("Choose an overall store rating."); return; }
    setPending(true); setMessage("");
    const response = await fetch(reviewId ? `/api/reviews/${reviewId}` : "/api/reviews", {
      method: reviewId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, orderNumber }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) { setMessage(result.error ?? "Could not save your review."); return; }
    router.push("/customer/reviews");
    router.refresh();
  }

  return (
    <form className="customer-review-form" onSubmit={submit}>
      <section>
        <span className="catalog-kicker">STORE RATING</span>
        <h2>How was {storeName}?</h2>
        <RatingField label="Overall rating" value={values.storeRating} required onChange={(value) => setRating("storeRating", value)} />
        <div className="review-aspect-grid">
          <RatingField label="Food quality" value={values.foodQualityRating} onChange={(value) => setRating("foodQualityRating", value)} />
          <RatingField label="Packaging" value={values.packagingRating} onChange={(value) => setRating("packagingRating", value)} />
          <RatingField label="Order accuracy" value={values.orderAccuracyRating} onChange={(value) => setRating("orderAccuracyRating", value)} />
        </div>
        <label className="review-comment">Written review <small>Optional</small><textarea maxLength={1500} value={values.writtenReview} onChange={(event) => setValues({ ...values, writtenReview: event.target.value })} placeholder="Tell other customers about your order." /></label>
      </section>

      {riderName && <section>
        <span className="catalog-kicker">RIDER RATING</span>
        <h2>How was delivery with {riderName}?</h2>
        <RatingField label="Overall experience" value={values.riderOverallRating} onChange={(value) => setRating("riderOverallRating", value)} />
        <div className="review-aspect-grid">
          <RatingField label="Friendliness" value={values.friendlinessRating} onChange={(value) => setRating("friendlinessRating", value)} />
          <RatingField label="Delivery speed" value={values.deliverySpeedRating} onChange={(value) => setRating("deliverySpeedRating", value)} />
          <RatingField label="Professionalism" value={values.professionalismRating} onChange={(value) => setRating("professionalismRating", value)} />
        </div>
        <label className="review-comment">Rider comment <small>Optional</small><textarea maxLength={1500} value={values.riderComment} onChange={(event) => setValues({ ...values, riderComment: event.target.value })} placeholder="Share feedback about the delivery." /></label>
      </section>}
      {message && <p className="review-form-message" role="alert">{message}</p>}
      <button className="review-submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Star />} {reviewId ? "Save changes" : "Submit review"}</button>
      <small className="review-edit-note">A submitted review can be edited for 24 hours.</small>
    </form>
  );
}

function RatingField({ label, value, onChange, required = false }: { label: string; value: number | null; onChange: (value: number) => void; required?: boolean }) {
  return <fieldset className="star-rating-field"><legend>{label}{required && <em>Required</em>}</legend><div>{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" className={value && star <= value ? "selected" : ""} onClick={() => onChange(star)} aria-label={`${star} star${star === 1 ? "" : "s"}`} aria-pressed={value === star}><Star /></button>)}</div><small>{value ? `${value} of 5` : required ? "Choose a rating" : "Optional"}</small></fieldset>;
}

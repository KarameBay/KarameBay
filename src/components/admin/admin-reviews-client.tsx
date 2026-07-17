"use client";

import { Eye, EyeOff, Flag, MessageSquareReply, Star, Trash2 } from "lucide-react";
import { useState } from "react";

type ReviewRow = {
  id: string; orderNumber: string; customerName: string; storeName: string;
  riderName: string | null; storeRating: number; riderOverallRating: number | null;
  writtenReview: string | null; riderComment: string | null; moderationStatus: string;
  moderationReason: string | null; adminReply: string | null; createdAt: string;
};

export function AdminReviewsClient({ initialReviews }: { initialReviews: ReviewRow[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function action(id: string, operation: "SHOW" | "HIDE" | "REPORT" | "REPLY", value?: string) {
    setBusy(id); setMessage("");
    const response = await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: operation, reason: operation === "REPORT" || operation === "HIDE" ? value : undefined, reply: operation === "REPLY" ? value : undefined }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!response.ok) { setMessage(result.error ?? "Moderation failed."); return; }
    setReviews((rows) => rows.map((row) => row.id === id ? { ...row, moderationStatus: operation === "SHOW" ? "VISIBLE" : operation === "HIDE" ? "HIDDEN" : operation === "REPORT" ? "REPORTED" : row.moderationStatus, adminReply: operation === "REPLY" ? value ?? null : row.adminReply } : row));
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this review permanently?")) return;
    setBusy(id); const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" }); setBusy(null);
    if (response.ok) setReviews((rows) => rows.filter((row) => row.id !== id));
    else setMessage("Could not delete the review.");
  }

  return <section className="admin-review-list">{message && <p className="admin-review-message">{message}</p>}{reviews.map((review) => <article key={review.id}><header><div><small>{review.orderNumber} · {review.moderationStatus}</small><h2>{review.storeName}</h2><p>{review.customerName} · {new Date(review.createdAt).toLocaleString("en-RW")}</p></div><span className="review-stars">{[1,2,3,4,5].map((value) => <Star key={value} className={value <= review.storeRating ? "filled" : ""} />)}</span></header>{review.writtenReview && <p>{review.writtenReview}</p>}{review.riderName && <div className="admin-rider-review"><b>Rider: {review.riderName}</b><span>{review.riderOverallRating ? `${review.riderOverallRating}/5` : "Not rated"}</span>{review.riderComment && <p>{review.riderComment}</p>}</div>}{review.adminReply && <blockquote><b>Admin reply</b>{review.adminReply}</blockquote>}<div className="admin-review-actions"><button disabled={busy === review.id} onClick={() => action(review.id, "SHOW")}><Eye /> Show</button><button disabled={busy === review.id} onClick={() => action(review.id, "HIDE", window.prompt("Moderation reason (optional)") ?? "")}><EyeOff /> Hide</button><button disabled={busy === review.id} onClick={() => action(review.id, "REPORT", window.prompt("Abuse report reason") ?? "")}><Flag /> Report</button><button disabled={busy === review.id} onClick={() => { const reply = window.prompt("Reply to this review", review.adminReply ?? ""); if (reply) action(review.id, "REPLY", reply); }}><MessageSquareReply /> Reply</button><button disabled={busy === review.id} onClick={() => remove(review.id)}><Trash2 /> Delete</button></div></article>)}</section>;
}

import { db } from "@/lib/db";

export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1_000;

export function isRating(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

export async function refreshRatingSummaries(storeId: string, riderId?: string | null) {
  const [storeAggregate, storeCount] = await Promise.all([
    db.review.aggregate({ where: { storeId, moderationStatus: "VISIBLE" }, _avg: { storeRating: true } }),
    db.review.count({ where: { storeId, moderationStatus: "VISIBLE" } }),
  ]);
  await db.store.update({
    where: { id: storeId },
    data: { rating: storeCount ? storeAggregate._avg.storeRating ?? 0 : 0 },
  });
  if (riderId) {
    const [riderAggregate, riderCount] = await Promise.all([
      db.review.aggregate({ where: { riderId, moderationStatus: "VISIBLE", riderOverallRating: { not: null } }, _avg: { riderOverallRating: true } }),
      db.review.count({ where: { riderId, moderationStatus: "VISIBLE", riderOverallRating: { not: null } } }),
    ]);
    await db.riderProfile.updateMany({
      where: { userId: riderId },
      data: { rating: riderCount ? riderAggregate._avg.riderOverallRating ?? 0 : 0 },
    });
  }
}

export function reviewStatusLabel(status: string) {
  if (status === "HIDDEN") return "Hidden";
  if (status === "REPORTED") return "Reported";
  return "Visible";
}

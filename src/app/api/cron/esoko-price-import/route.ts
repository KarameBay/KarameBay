import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ESOKO_SOURCE,
  ESOKO_TARGET_STORE_SLUG,
  fetchAndStageEsokoPrices,
  latestKigaliMonday,
  logFailedImportAttempt,
  priceSnapshotDateKey,
} from "@/lib/esoko-importer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function validCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function GET(request: NextRequest) {
  if (!validCronSecret(request))
    return NextResponse.json({ error: "Invalid cron authorization." }, { status: 401 });

  const [admin, store] = await Promise.all([
    db.user.findFirst({
      where: { role: "ADMIN", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    db.store.findFirst({
      where: { slug: ESOKO_TARGET_STORE_SLUG, catalogEngine: "MARKETPLACE" },
      select: { id: true },
    }),
  ]);
  if (!admin || !store)
    return NextResponse.json({ error: "Importer administrator or Kimironko Market is missing." }, { status: 503 });

  const snapshotDate = latestKigaliMonday();
  const existing = await db.priceImportBatch.findFirst({
    where: {
      storeId: store.id,
      source: ESOKO_SOURCE,
      snapshotDate,
      status: { in: ["STARTED", "COMPLETED", "PARTIALLY_COMPLETED"] },
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, status: true, recordsCreated: true },
  });
  if (existing)
    return NextResponse.json({
      ok: true,
      skipped: true,
      snapshotDate: priceSnapshotDateKey(snapshotDate),
      batch: existing,
    });

  try {
    const batch = await fetchAndStageEsokoPrices(admin.id, snapshotDate);
    return NextResponse.json({
      ok: true,
      skipped: false,
      snapshotDate: priceSnapshotDateKey(snapshotDate),
      batchId: batch.id,
      recordsCreated: batch.recordsCreated,
    });
  } catch (error) {
    await logFailedImportAttempt(admin.id, ESOKO_SOURCE, error, snapshotDate).catch(() => undefined);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Weekly price import failed.",
        snapshotDate: priceSnapshotDateKey(snapshotDate),
      },
      { status: 503 },
    );
  }
}

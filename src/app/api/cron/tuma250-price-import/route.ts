import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { latestKigaliMonday, priceSnapshotDateKey } from "@/lib/esoko-importer";
import {
  fetchAndStageTuma250Catalog,
  TUMA250_PRODUCTS_URL,
  TUMA250_SOURCE,
} from "@/lib/tuma250-importer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function validCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function GET(request: NextRequest) {
  if (!validCronSecret(request))
    return NextResponse.json({ error: "Invalid cron authorization." }, { status: 401 });

  const configuredStoreSlug = process.env.TUMA250_CRON_STORE_SLUG?.trim();
  const [admin, store] = await Promise.all([
    db.user.findFirst({
      where: { role: "ADMIN", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    db.store.findFirst({
      where: {
        catalogEngine: "MARKETPLACE",
        status: { not: "ARCHIVED" },
        ...(configuredStoreSlug ? { slug: configuredStoreSlug } : {}),
      },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ]);
  if (!admin || !store)
    return NextResponse.json({ error: "Importer administrator or retail catalog store is missing." }, { status: 503 });

  const weekStart = latestKigaliMonday();
  const existing = await db.priceImportBatch.findFirst({
    where: {
      storeId: store.id,
      source: TUMA250_SOURCE,
      snapshotDate: { gte: weekStart },
      status: { in: ["STARTED", "COMPLETED", "PARTIALLY_COMPLETED"] },
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, status: true, recordsCreated: true },
  });
  if (existing)
    return NextResponse.json({
      ok: true,
      skipped: true,
      weekStart: priceSnapshotDateKey(weekStart),
      batch: existing,
    });

  try {
    const batch = await fetchAndStageTuma250Catalog(admin.id, store.slug);
    return NextResponse.json({
      ok: true,
      skipped: false,
      weekStart: priceSnapshotDateKey(weekStart),
      batchId: batch.id,
      recordsCreated: batch.recordsCreated,
      message: "Prices were staged for administrator review; storefront prices were not changed automatically.",
    });
  } catch (error) {
    await db.priceImportBatch.create({
      data: {
        source: TUMA250_SOURCE,
        sourceUrl: TUMA250_PRODUCTS_URL,
        targetMarket: store.name,
        snapshotDate: new Date(),
        storeId: store.id,
        startedById: admin.id,
        status: "FAILED",
        errorDetails: error instanceof Error ? error.message : "Unexpected import failure",
        completedAt: new Date(),
      },
    }).catch(() => undefined);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weekly catalog import failed." },
      { status: 503 },
    );
  }
}

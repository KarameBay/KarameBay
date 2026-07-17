import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  approvePriceRecords,
  approvePendingPriceBatch,
  fetchAndStageEsokoPrices,
  latestKigaliMonday,
  logFailedImportAttempt,
  matchPriceRecord,
  rejectPriceRecords,
  rejectPendingPriceBatch,
  stagePriceRows,
  type PriceApprovalInput,
} from "@/lib/esoko-importer";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePriceImportFile } from "@/lib/price-import-file";
import { rateLimit } from "@/lib/rate-limit";
import { fetchAndStageTuma250Catalog } from "@/lib/tuma250-importer";

export const maxDuration = 300;

const approvalSchema = z.object({
  recordId: z.string().min(1),
  action: z.enum(["KEEP_CURRENT", "REPLACE", "MARKUP_PERCENT", "ADD_FIXED", "CUSTOM", "CREATE_NEW"]),
  productId: z.string().optional(),
  productName: z.string().trim().min(2).max(120).optional(),
  categoryId: z.string().optional(),
  unit: z.string().trim().optional(),
  sellingPriceRwf: z.coerce.number().int().min(0).optional(),
  markupPercent: z.coerce.number().min(0).max(500).optional(),
  fixedAmountRwf: z.coerce.number().int().min(0).optional(),
  roundTo: z.coerce.number().int().optional(),
  createAlias: z.boolean().optional(),
});

async function revalidateImportedStoreByRecordIds(recordIds: string[]) {
  const stores = await db.priceImportRecord.findMany({
    where: { id: { in: recordIds } },
    select: { store: { select: { slug: true } } },
    distinct: ["storeId"],
  });
  for (const row of stores) revalidatePath(`/stores/${row.store.slug}`);
}

async function revalidateImportedStoreByBatchId(batchId: string) {
  const batch = await db.priceImportBatch.findUnique({
    where: { id: batchId },
    select: { store: { select: { slug: true } } },
  });
  if (batch) revalidatePath(`/stores/${batch.store.slug}`);
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin || admin.role !== "ADMIN")
    return NextResponse.json({ error: "Administrator access required" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  let failureSource: string | null = null;
  let failureSnapshotDate: Date | null = null;
  try {
    if (contentType.includes("multipart/form-data")) {
      failureSource = "ADMIN_FILE";
      if (!rateLimit(`price-file:${admin.id}`, 5, 5 * 60_000))
        return NextResponse.json({ error: "Please wait before uploading another file." }, { status: 429 });
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        return NextResponse.json({ error: "Choose a CSV or .xlsx file." }, { status: 400 });
      const rows = await parsePriceImportFile(file);
      const batch = await stagePriceRows({
        adminId: admin.id,
        source: "ADMIN_FILE",
        sourceUrl: `Admin upload: ${file.name}`,
        rows,
      });
      revalidatePath("/admin/products/import");
      return NextResponse.json({ ok: true, batchId: batch.id });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    if (action === "FETCH_ESOKO") {
      failureSource = "ESOKO";
      failureSnapshotDate = latestKigaliMonday();
      if (!rateLimit(`esoko-fetch:${admin.id}`, 2, 5 * 60_000))
        return NextResponse.json({ error: "Please wait a few minutes before fetching again." }, { status: 429 });
      const batch = await fetchAndStageEsokoPrices(admin.id, failureSnapshotDate);
      revalidatePath("/admin/products/import");
      return NextResponse.json({ ok: true, batchId: batch.id });
    }
    if (action === "FETCH_TUMA250") {
      const targetStoreSlug = String(body.targetStoreSlug || "");
      const targetStore = await db.store.findFirst({
        where: { slug: targetStoreSlug, catalogEngine: "MARKETPLACE", status: { not: "ARCHIVED" } },
        select: { id: true, slug: true },
      });
      if (!targetStore)
        return NextResponse.json({ error: "Choose a retail catalog store. Restaurant stores cannot use price import." }, { status: 400 });
      const parsedCategories = z.array(z.coerce.number().int().positive()).max(12).optional().safeParse(body.tumaCategoryIds);
      if (!parsedCategories.success)
        return NextResponse.json({ error: "Choose valid Tuma250 categories." }, { status: 400 });
      if (!rateLimit(`tuma250-fetch:${admin.id}`, 2, 10 * 60_000))
        return NextResponse.json({ error: "Please wait before fetching the Tuma250 catalog again." }, { status: 429 });
      const batch = await fetchAndStageTuma250Catalog(admin.id, targetStoreSlug, parsedCategories.data);
      revalidatePath("/admin/products/import");
      return NextResponse.json({ ok: true, batchId: batch.id, targetStoreSlug });
    }
    if (action === "APPROVE") {
      const parsed = z.array(approvalSchema).min(1).max(200).safeParse(body.items);
      if (!parsed.success) return NextResponse.json({ error: "Check the selected approval actions." }, { status: 400 });
      const approved = await approvePriceRecords(admin.id, parsed.data as PriceApprovalInput[]);
      revalidatePath("/admin/products/import");
      revalidatePath("/admin/products");
      await revalidateImportedStoreByRecordIds(parsed.data.map((item) => item.recordId));
      return NextResponse.json({ ok: true, approved });
    }
    if (action === "APPROVE_BATCH") {
      const parsed = z.object({ batchId: z.string().min(1) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Choose an import batch." }, { status: 400 });
      const approved = await approvePendingPriceBatch(admin.id, parsed.data.batchId);
      revalidatePath("/admin/products/import");
      revalidatePath("/admin/products");
      await revalidateImportedStoreByBatchId(parsed.data.batchId);
      return NextResponse.json({ ok: true, approved });
    }
    if (action === "REJECT") {
      const parsed = z.array(z.string().min(1)).min(1).max(200).safeParse(body.recordIds);
      if (!parsed.success) return NextResponse.json({ error: "Select records to reject." }, { status: 400 });
      const rejected = await rejectPriceRecords(admin.id, parsed.data);
      revalidatePath("/admin/products/import");
      return NextResponse.json({ ok: true, rejected });
    }
    if (action === "REJECT_BATCH") {
      const parsed = z.object({ batchId: z.string().min(1) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Choose an import batch." }, { status: 400 });
      const rejected = await rejectPendingPriceBatch(admin.id, parsed.data.batchId);
      revalidatePath("/admin/products/import");
      return NextResponse.json({ ok: true, rejected });
    }
    if (action === "MATCH") {
      const parsed = z.object({ recordId: z.string().min(1), productId: z.string().min(1) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Choose an import record and product." }, { status: 400 });
      await matchPriceRecord(parsed.data.recordId, parsed.data.productId);
      revalidatePath("/admin/products/import");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown import action" }, { status: 400 });
  } catch (error) {
    if (failureSource && !(error && typeof error === "object" && "importBatchLogged" in error))
      await logFailedImportAttempt(admin.id, failureSource, error, failureSnapshotDate).catch(() => undefined);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Price import failed. Existing prices were not changed." },
      { status: 500 },
    );
  }
}

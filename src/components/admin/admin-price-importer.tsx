"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle2, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRwf } from "@/lib/catalog";
import { formatKigaliDate, formatKigaliDateTime } from "@/lib/date-format";

type ProductOption = { id: string; name: string; priceRwf: number | null; unit: string | null };
type CategoryOption = { id: string; name: string; departmentName: string };
type TumaCategoryOption = { id: number; name: string; label: string; count: number };
type StoreOption = { slug: string; name: string };
type ImportRecord = {
  id: string;
  source: string;
  commodityName: string;
  categoryName: string | null;
  unit: string | null;
  priceType: string;
  importedPriceRwf: number | null;
  proposedAction: string;
  proposedSellingPriceRwf: number | null;
  markupPercent: number | null;
  priceDate: string | null;
  importStatus: string;
  matchStatus: string;
  reviewNote: string | null;
  matchedProductId: string | null;
  matchedProduct: { id: string; name: string; units: Array<{ priceRwf: number; label: string }> } | null;
  suggestedCategoryId: string | null;
};
type Batch = {
  id: string;
  source: string;
  status: string;
  snapshotDate: string | null;
  startedAt: string;
  completedAt: string | null;
  recordsFetched: number;
  recordsCreated: number;
  matchedProducts: number;
  newProducts: number;
  priceChanges: number;
  unchangedProducts: number;
  failedRecords: number;
  requiringReview: number;
  acceptedRecords: number;
  rejectedRecords: number;
  errorDetails: string | null;
};
type Review = {
  selected: boolean;
  action: "KEEP_CURRENT" | "REPLACE" | "MARKUP_PERCENT" | "ADD_FIXED" | "CUSTOM" | "CREATE_NEW";
  productId: string;
  productName: string;
  categoryId: string;
  unit: string;
  sellingPriceRwf: string;
  markupPercent: string;
  fixedAmountRwf: string;
  roundTo: string;
  createAlias: boolean;
};
type ProgressState = {
  label: string;
  detail: string;
  total: number;
  status: "working" | "complete" | "error";
} | null;

async function sendJson(payload: unknown) {
  const response = await fetch("/api/admin/price-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "The price import action failed.");
  return data;
}

const subscribeToHydration = () => () => {};

export function AdminPriceImporter({
  targetStoreSlug,
  targetStoreName,
  storeOptions,
  batches,
  selectedBatch,
  records,
  products,
  categories,
  tumaCategories,
  page,
  pages,
  batchPendingCount,
}: {
  targetStoreSlug: string;
  targetStoreName: string;
  storeOptions: StoreOption[];
  batches: Batch[];
  selectedBatch: Batch | null;
  records: ImportRecord[];
  products: ProductOption[];
  categories: CategoryOption[];
  tumaCategories: TumaCategoryOption[];
  page: number;
  pages: number;
  batchPendingCount: number;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProgressState>(null);
  const [selectAllBatch, setSelectAllBatch] = useState(false);
  const [selectedTumaCategoryIds, setSelectedTumaCategoryIds] = useState<number[]>([]);
  const [review, setReview] = useState<Record<string, Review>>(() =>
    Object.fromEntries(
      records.map((record) => [
        record.id,
        {
          selected: false,
          action: record.matchedProduct
            ? record.proposedAction === "MARKUP_PERCENT"
              ? "MARKUP_PERCENT"
              : record.proposedAction === "REPLACE"
                ? "REPLACE"
                : "KEEP_CURRENT"
            : "CREATE_NEW",
          productId: record.matchedProductId ?? "",
          productName: record.commodityName,
          categoryId: record.suggestedCategoryId ?? "",
          unit: record.unit ?? "",
          sellingPriceRwf: String(record.proposedSellingPriceRwf ?? record.matchedProduct?.units[0]?.priceRwf ?? record.importedPriceRwf ?? ""),
          markupPercent: String(record.markupPercent ?? 10),
          fixedAmountRwf: "0",
          roundTo: record.priceType === "WHOLESALE" ? "10" : "1",
          createAlias: false,
        },
      ]),
    ),
  );

  function update(id: string, patch: Partial<Review>) {
    setReview((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function selectAllPending(selected: boolean) {
    setSelectAllBatch(selected);
    setReview((current) => {
      const next = { ...current };
      for (const record of records) {
        if (record.importStatus === "PENDING_REVIEW")
          next[record.id] = { ...next[record.id], selected };
      }
      return next;
    });
  }

  function toggleTumaCategory(categoryId: number) {
    setSelectedTumaCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  async function fetchLatest() {
    setBusy("fetch"); setError(""); setMessage("");
    setProgress({
      label: "Fetching Tuma250 prices",
      detail: "Reading product names and prices for review.",
      total: selectedTumaCategoryIds.length || 3,
      status: "working",
    });
    try {
      const data = await sendJson({
        action: "FETCH_TUMA250",
        targetStoreSlug,
        tumaCategoryIds: selectedTumaCategoryIds.length ? selectedTumaCategoryIds : undefined,
      });
      const categoryText = selectedTumaCategoryIds.length
        ? `${selectedTumaCategoryIds.length} selected Tuma250 ${selectedTumaCategoryIds.length === 1 ? "category" : "categories"}`
        : "the default Tuma250 categories";
      setMessage(`Tuma250 product names and exact displayed prices were staged from ${categoryText}. No external images or descriptions were copied.`);
      setProgress({
        label: "Fetch complete",
        detail: "Products were staged for Admin review.",
        total: Number(data.recordsCreated) || selectedTumaCategoryIds.length || 1,
        status: "complete",
      });
      router.push(`/admin/products/import?store=${targetStoreSlug}&batch=${data.batchId}`);
      router.refresh();
    } catch (actionError) {
      const detail = actionError instanceof Error ? actionError.message : "Fetch failed.";
      setError(detail);
      setProgress({ label: "Fetch failed", detail, total: 1, status: "error" });
    }
    finally { setBusy(""); }
  }

  async function approve(safeOnly = false) {
    if (!safeOnly && selectAllBatch) {
      if (!selectedBatch || batchPendingCount === 0) { setError("There are no pending products in this batch."); return; }
      if (!window.confirm(`Approve exactly ${batchPendingCount} pending ${batchPendingCount === 1 ? "product" : "products"} across all pages?`)) return;
      setBusy("approve"); setError("");
      setProgress({
        label: "Approving products",
        detail: `Publishing ${batchPendingCount} selected product${batchPendingCount === 1 ? "" : "s"} across all pages.`,
        total: batchPendingCount,
        status: "working",
      });
      try {
        const data = await sendJson({ action: "APPROVE_BATCH", batchId: selectedBatch.id });
        setMessage(`${data.approved} product(s) approved across all pages. Make any individual changes in the Market Engine.`);
        setProgress({
          label: "Approval complete",
          detail: `${data.approved} product${data.approved === 1 ? "" : "s"} approved successfully.`,
          total: Number(data.approved) || batchPendingCount,
          status: "complete",
        });
        setSelectAllBatch(false);
        router.refresh();
      } catch (actionError) {
        const detail = actionError instanceof Error ? actionError.message : "Batch approval failed.";
        setError(detail);
        setProgress({ label: "Approval failed", detail, total: batchPendingCount, status: "error" });
      }
      finally { setBusy(""); }
      return;
    }
    const chosen = records.filter((record) => {
      const state = review[record.id];
      return record.importStatus === "PENDING_REVIEW" && (safeOnly ? record.matchStatus === "MATCHED" : state?.selected);
    });
    if (!chosen.length) { setError("Select at least one pending record."); return; }
    const approvalLabel = chosen.length === 1 ? "1 product" : `${chosen.length} products`;
    if (!window.confirm(`Approve exactly ${approvalLabel} from this page?`)) return;
    setBusy("approve"); setError("");
    setProgress({
      label: "Approving products",
      detail: `Publishing ${approvalLabel} from this page.`,
      total: chosen.length,
      status: "working",
    });
    try {
      const items = chosen.map((record) => {
        const state = review[record.id];
        return {
          recordId: record.id,
          action: state.action,
          productId: state.productId || undefined,
          productName: state.productName.trim() || undefined,
          categoryId: state.categoryId || undefined,
          unit: state.unit || undefined,
          sellingPriceRwf: state.sellingPriceRwf ? Number(state.sellingPriceRwf) : undefined,
          markupPercent: state.markupPercent ? Number(state.markupPercent) : undefined,
          fixedAmountRwf: state.fixedAmountRwf ? Number(state.fixedAmountRwf) : undefined,
          roundTo: Number(state.roundTo),
          createAlias: state.createAlias,
        };
      });
      const data = await sendJson({ action: "APPROVE", items });
      setMessage(`${data.approved} price record(s) approved.`);
      setProgress({
        label: "Approval complete",
        detail: `${data.approved} price record${data.approved === 1 ? "" : "s"} approved successfully.`,
        total: Number(data.approved) || chosen.length,
        status: "complete",
      });
      router.refresh();
    } catch (actionError) {
      const detail = actionError instanceof Error ? actionError.message : "Approval failed.";
      setError(detail);
      setProgress({ label: "Approval failed", detail, total: chosen.length, status: "error" });
    }
    finally { setBusy(""); }
  }

  async function reject() {
    if (selectAllBatch) {
      if (!selectedBatch || batchPendingCount === 0) { setError("There are no pending products in this batch."); return; }
      if (!window.confirm(`Reject exactly ${batchPendingCount} pending ${batchPendingCount === 1 ? "product" : "products"} across all pages?`)) return;
      setBusy("reject"); setError("");
      setProgress({
        label: "Rejecting products",
        detail: `Rejecting ${batchPendingCount} pending product${batchPendingCount === 1 ? "" : "s"} across all pages.`,
        total: batchPendingCount,
        status: "working",
      });
      try {
        const data = await sendJson({ action: "REJECT_BATCH", batchId: selectedBatch.id });
        setMessage(`${data.rejected} product(s) rejected across all pages.`);
        setProgress({
          label: "Rejection complete",
          detail: `${data.rejected} product${data.rejected === 1 ? "" : "s"} rejected.`,
          total: Number(data.rejected) || batchPendingCount,
          status: "complete",
        });
        setSelectAllBatch(false);
        router.refresh();
      } catch (actionError) {
        const detail = actionError instanceof Error ? actionError.message : "Batch rejection failed.";
        setError(detail);
        setProgress({ label: "Rejection failed", detail, total: batchPendingCount, status: "error" });
      }
      finally { setBusy(""); }
      return;
    }
    const recordIds = records.filter((record) => review[record.id]?.selected && record.importStatus === "PENDING_REVIEW").map((record) => record.id);
    if (!recordIds.length) { setError("Select at least one pending record."); return; }
    if (!window.confirm(`Reject exactly ${recordIds.length} selected ${recordIds.length === 1 ? "product" : "products"} from this page?`)) return;
    setBusy("reject"); setError("");
    setProgress({
      label: "Rejecting products",
      detail: `Rejecting ${recordIds.length} selected product${recordIds.length === 1 ? "" : "s"}.`,
      total: recordIds.length,
      status: "working",
    });
    try {
      const data = await sendJson({ action: "REJECT", recordIds });
      setMessage(`${data.rejected} price record(s) rejected.`);
      setProgress({
        label: "Rejection complete",
        detail: `${data.rejected} price record${data.rejected === 1 ? "" : "s"} rejected.`,
        total: Number(data.rejected) || recordIds.length,
        status: "complete",
      });
      router.refresh();
    } catch (actionError) {
      const detail = actionError instanceof Error ? actionError.message : "Rejection failed.";
      setError(detail);
      setProgress({ label: "Rejection failed", detail, total: recordIds.length, status: "error" });
    }
    finally { setBusy(""); }
  }

  async function saveMatch(recordId: string) {
    const productId = review[recordId]?.productId;
    if (!productId) { setError("Choose an existing product from the selected market first."); return; }
    setBusy(`match-${recordId}`); setError("");
    try { await sendJson({ action: "MATCH", recordId, productId }); setMessage("Product match saved."); router.refresh(); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Could not save the match."); }
    finally { setBusy(""); }
  }

  const stats = selectedBatch
    ? [
        ["Found", selectedBatch.recordsFetched], ["Staged", selectedBatch.recordsCreated], ["Matched", selectedBatch.matchedProducts],
        ["New", selectedBatch.newProducts], ["Price changes", selectedBatch.priceChanges], ["Unchanged", selectedBatch.unchangedProducts],
        ["Failed", selectedBatch.failedRecords], ["Review", selectedBatch.requiringReview],
      ]
    : [];
  const pendingRecords = records.filter((record) => record.importStatus === "PENDING_REVIEW");
  const allPendingSelected = selectAllBatch || (pendingRecords.length > 0 && pendingRecords.every((record) => review[record.id]?.selected));
  const selectedPendingCount = selectAllBatch ? batchPendingCount : pendingRecords.filter((record) => review[record.id]?.selected).length;
  const safeMatchCount = pendingRecords.filter((record) => record.matchStatus === "MATCHED").length;
  const selectedCategoryLabel = selectedTumaCategoryIds.length
    ? `${selectedTumaCategoryIds.length} selected`
    : "Default categories";

  return (
    <div className="price-import-shell">
      <section className="admin-management-card price-import-controls">
        <div><span className="catalog-kicker">PUBLIC STOREFRONT PRICES</span><h2>{targetStoreName}</h2><p>Choose any retail catalog store, then select the Tuma250 categories to import. Restaurant stores are excluded.</p></div>
        <label>Import into<select value={targetStoreSlug} onChange={(event) => router.push(`/admin/products/import?store=${event.target.value}`)} aria-label="Import destination">
          {storeOptions.map((store) => <option key={store.slug} value={store.slug}>{store.name}</option>)}
        </select><small>Only Retail Catalog Engine stores appear here.</small></label>
        <label className="tuma-category-picker">Tuma categories<details>
          <summary>{selectedCategoryLabel}</summary>
          <div>
            <button type="button" onClick={() => setSelectedTumaCategoryIds([])}>Use default categories</button>
            {tumaCategories.map((category) => (
              <label key={category.id}>
                <input
                  type="checkbox"
                  checked={selectedTumaCategoryIds.includes(category.id)}
                  onChange={() => toggleTumaCategory(category.id)}
                />
                <span>{category.label}{category.count ? ` (${category.count})` : ""}</span>
              </label>
            ))}
          </div>
        </details><small>Leave empty to import the default market set.</small></label>
        <button type="button" onClick={fetchLatest} disabled={Boolean(busy)}>{busy === "fetch" ? <LoaderCircle className="spin" /> : <RefreshCw />} Fetch selected categories</button>
      </section>

      {(error || message) && <div className={error ? "form-error price-import-notice" : "form-success price-import-notice"}>{error || message}</div>}

      <section className="price-import-batchbar admin-management-card">
        <label>Import batch<select value={selectedBatch?.id ?? ""} onChange={(event) => router.push(`/admin/products/import?store=${targetStoreSlug}&batch=${event.target.value}`)}><option value="">No imports yet</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.snapshotDate ? `Snapshot ${formatKigaliDate(batch.snapshotDate)}` : formatKigaliDateTime(batch.startedAt)} · {batch.source} · {batch.status.replaceAll("_", " ")}</option>)}</select></label>
        {selectedBatch && <div><span className={`price-batch-status ${selectedBatch.status.toLowerCase()}`}>{selectedBatch.status.replaceAll("_", " ")}</span><small>{selectedBatch.errorDetails || `${selectedBatch.snapshotDate ? `Source date ${formatKigaliDate(selectedBatch.snapshotDate)} · ` : ""}Completed ${selectedBatch.completedAt ? formatKigaliDateTime(selectedBatch.completedAt) : "in progress"}`}</small></div>}
      </section>

      {progress && (
        <section className={`price-import-progress ${progress.status}`}>
          <div>
            <b>{progress.label}</b>
            <span>{progress.detail}</span>
          </div>
          <small>
            {progress.status === "working"
              ? `${progress.total} queued`
              : progress.status === "complete"
                ? "Completed"
                : "Needs attention"}
          </small>
          <div className="price-import-progress-track">
            <i />
          </div>
        </section>
      )}

      {selectedBatch && <section className="price-import-stats">{stats.map(([label, value]) => <article key={String(label)}><small>{label}</small><b>{value}</b></article>)}</section>}

      <section className="admin-management-card price-review-card">
        <header><div><span className="catalog-kicker">REVIEW BEFORE PUBLISHING</span><h2>Price review</h2><p>Imported values are reference prices until you approve an action.</p></div><div className="price-review-actions"><span className="price-selection-count"><b>{selectedPendingCount}</b> {selectAllBatch ? "selected across all pages" : "selected on this page"}</span><button type="button" onClick={() => approve(true)} disabled={!hydrated || Boolean(busy) || safeMatchCount === 0}><CheckCircle2 /> Approve exact matches ({safeMatchCount})</button><button type="button" onClick={() => approve(false)} disabled={!hydrated || Boolean(busy) || selectedPendingCount === 0}>Approve selected ({selectedPendingCount})</button><button type="button" className="danger" onClick={reject} disabled={!hydrated || Boolean(busy) || selectedPendingCount === 0}><XCircle /> Reject selected ({selectedPendingCount})</button></div></header>
        <div className="price-review-scroll-top" ref={topScrollRef} onScroll={(event) => { if (tableScrollRef.current) tableScrollRef.current.scrollLeft = event.currentTarget.scrollLeft; }} aria-label="Horizontal table scrollbar"><div /></div>
        <div className="price-review-scroll" ref={tableScrollRef} onScroll={(event) => { if (topScrollRef.current) topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft; }}><table><thead><tr><th><label className="price-select-all"><input type="checkbox" checked={allPendingSelected} onChange={(event) => selectAllPending(event.target.checked)} disabled={batchPendingCount === 0} /> Select all {batchPendingCount} across pages</label></th><th>Product name</th><th>Category / unit</th><th>Existing</th><th>Imported</th><th>Difference</th><th>Match</th><th>Proposed action</th><th>Action value</th></tr></thead><tbody>
          {records.map((record) => {
            const state = review[record.id];
            const existing = record.matchedProduct?.units[0]?.priceRwf ?? null;
            const difference = existing !== null && record.importedPriceRwf !== null ? record.importedPriceRwf - existing : null;
            const percent = difference !== null && existing ? (difference / existing) * 100 : null;
            return <tr key={record.id} className={record.importStatus !== "PENDING_REVIEW" ? "reviewed" : ""}>
              <td><input type="checkbox" checked={selectAllBatch || (state?.selected ?? false)} onChange={(event) => { setSelectAllBatch(false); update(record.id, { selected: event.target.checked }); }} disabled={record.importStatus !== "PENDING_REVIEW"} /><small>{record.importStatus.replaceAll("_", " ")}</small></td>
              <td><input className="price-product-name-input" value={state?.productName ?? record.commodityName} onChange={(event) => update(record.id, { productName: event.target.value })} minLength={2} maxLength={120} disabled={record.importStatus !== "PENDING_REVIEW"} aria-label={`Product name for ${record.commodityName}`} /><small>Source: {record.commodityName} · {record.priceDate ? formatKigaliDate(record.priceDate) : "No valid date"}</small>{record.reviewNote && <em>{record.reviewNote}</em>}</td>
              <td><span>{record.categoryName || "Needs category"}</span><input value={state?.unit ?? ""} onChange={(event) => update(record.id, { unit: event.target.value })} placeholder="Unit" /></td>
              <td>{existing === null ? "—" : formatRwf(existing)}</td>
              <td><b>{record.importedPriceRwf === null ? "Invalid" : formatRwf(record.importedPriceRwf)}</b><small>{record.priceType === "WHOLESALE" ? `Wholesale +10% → ${record.proposedSellingPriceRwf === null ? "—" : formatRwf(record.proposedSellingPriceRwf)}` : record.priceType}</small></td>
              <td className={difference && difference > 0 ? "price-up" : difference && difference < 0 ? "price-down" : ""}>{difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatRwf(difference)}`}<small>{percent === null ? "" : `${percent.toFixed(1)}%`}</small></td>
              <td><span className={`match-pill ${record.matchStatus.toLowerCase()}`}>{record.matchStatus.replaceAll("_", " ")}</span><select value={state?.productId ?? ""} onChange={(event) => update(record.id, { productId: event.target.value })}><option value="">Choose existing product</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.unit || "unit"}</option>)}</select><button type="button" className="match-button" onClick={() => saveMatch(record.id)} disabled={!state?.productId || busy === `match-${record.id}`}>Save match</button></td>
              <td><select value={state?.action ?? "KEEP_CURRENT"} onChange={(event) => update(record.id, { action: event.target.value as Review["action"] })} disabled={record.source === "TUMA250"}>{record.source === "TUMA250" ? <option value={record.matchedProduct ? "REPLACE" : "CREATE_NEW"}>{record.matchedProduct ? "Use exact imported price" : "Create with exact price"}</option> : <><option value="KEEP_CURRENT">Keep current price</option><option value="REPLACE">Use imported price</option><option value="MARKUP_PERCENT">Add percentage markup</option><option value="ADD_FIXED">Add fixed amount</option><option value="CUSTOM">Custom selling price</option>{!record.matchedProduct && <option value="CREATE_NEW">Create unavailable product</option>}</>}</select>{state?.action === "CREATE_NEW" && <select value={state.categoryId} onChange={(event) => update(record.id, { categoryId: event.target.value })}><option value="">Choose category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.departmentName} · {category.name}</option>)}</select>}<label className="alias-check"><input type="checkbox" checked={state?.createAlias ?? false} onChange={(event) => update(record.id, { createAlias: event.target.checked })} /> Save name as alias</label></td>
              <td>{state?.action === "MARKUP_PERCENT" && <input type="number" min="0" max="500" value={state.markupPercent} onChange={(event) => update(record.id, { markupPercent: event.target.value })} placeholder="Markup %" />}{state?.action === "ADD_FIXED" && <input type="number" min="0" value={state.fixedAmountRwf} onChange={(event) => update(record.id, { fixedAmountRwf: event.target.value })} placeholder="RWF amount" />}{state?.action === "CUSTOM" && <input type="number" min="0" value={state.sellingPriceRwf} onChange={(event) => update(record.id, { sellingPriceRwf: event.target.value })} placeholder="Selling price" />}{state?.action === "CREATE_NEW" && record.proposedSellingPriceRwf !== null && <small>New selling price: {formatRwf(record.proposedSellingPriceRwf)}</small>}<select value={state?.roundTo ?? "1"} onChange={(event) => update(record.id, { roundTo: event.target.value })} disabled={record.source === "TUMA250" || (record.priceType === "WHOLESALE" && (state?.action === "MARKUP_PERCENT" || state?.action === "CREATE_NEW"))}><option value="1">Exact RWF</option><option value="10">Round up to 10</option><option value="50">Round to 50</option><option value="100">Round to 100</option></select></td>
            </tr>;
          })}
          {!records.length && <tr><td colSpan={9} className="price-empty">Fetch prices or upload a file to begin review.</td></tr>}
        </tbody></table></div>
        {selectedBatch && pages > 1 && <div className="price-import-pagination"><button type="button" disabled={page <= 1} onClick={() => router.push(`/admin/products/import?store=${targetStoreSlug}&batch=${selectedBatch.id}&page=${page - 1}`)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => router.push(`/admin/products/import?store=${targetStoreSlug}&batch=${selectedBatch.id}&page=${page + 1}`)}>Next</button></div>}
      </section>
    </div>
  );
}

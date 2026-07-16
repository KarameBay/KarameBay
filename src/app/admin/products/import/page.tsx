import Link from "next/link";
import { AdminPriceImporter } from "@/components/admin/admin-price-importer";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

export default async function KimironkoPriceImportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; page?: string; store?: string }>;
}) {
  const admin = await requireRole("ADMIN");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const storeSlug = params.store === "zinia-kicukiro-market" ? "zinia-kicukiro-market" : "kimironko-market";
  const store = await db.store.findFirst({
    where: { slug: storeSlug, catalogEngine: "MARKETPLACE" },
    select: { id: true, name: true },
  });
  if (!store) throw new Error("The selected market is not configured.");

  const batches = await db.priceImportBatch.findMany({
    where: { storeId: store.id },
    orderBy: { startedAt: "desc" },
    take: 30,
  });
  const selectedBatch = batches.find((batch) => batch.id === params.batch) ?? batches[0] ?? null;
  const [records, recordCount, products, departments, batchPendingCount] = await Promise.all([
    selectedBatch
      ? db.priceImportRecord.findMany({
          where: { batchId: selectedBatch.id },
          include: {
            matchedProduct: {
              select: {
                id: true,
                name: true,
                units: { where: { isDefault: true }, select: { priceRwf: true, label: true }, take: 1 },
              },
            },
          },
          orderBy: [{ importStatus: "asc" }, { commodityName: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
    selectedBatch ? db.priceImportRecord.count({ where: { batchId: selectedBatch.id } }) : Promise.resolve(0),
    db.marketplaceProduct.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        name: true,
        units: { where: { isDefault: true }, select: { priceRwf: true, label: true }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    db.marketplaceDepartment.findMany({
      where: { storeId: store.id },
      select: { name: true, categories: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    selectedBatch
      ? db.priceImportRecord.count({ where: { batchId: selectedBatch.id, importStatus: "PENDING_REVIEW" } })
      : Promise.resolve(0),
  ]);

  const batchRows = batches.map((batch) => ({
    ...batch,
    snapshotDate: batch.snapshotDate?.toISOString() ?? null,
    startedAt: batch.startedAt.toISOString(),
    completedAt: batch.completedAt?.toISOString() ?? null,
  }));
  const selectedRow = selectedBatch
    ? { ...selectedBatch, snapshotDate: selectedBatch.snapshotDate?.toISOString() ?? null, startedAt: selectedBatch.startedAt.toISOString(), completedAt: selectedBatch.completedAt?.toISOString() ?? null }
    : null;
  const categoryOptions = departments.flatMap((department) =>
    department.categories.map((category) => ({
      id: category.id,
      name: category.name,
      departmentName: department.name,
    })),
  );

  return (
    <>
      <main className="admin-orders-page">
        <header className="admin-dashboard-header">
          <div>
            <span className="catalog-kicker">{store.name.toUpperCase()} · CATALOG IMPORT</span>
            <h1>Tuma250 product and price importer</h1>
            <p>Import product names and exact displayed RWF prices. External images and descriptions are never copied.</p>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/products">Market engine</Link>
            <Link href="/admin/stores">Stores</Link>
          </div>
        </header>

        <AdminPriceImporter
          key={`${storeSlug}:${selectedBatch?.id ?? "no-batch"}`}
          targetStoreSlug={storeSlug}
          targetStoreName={store.name}
          batches={batchRows}
          selectedBatch={selectedRow}
          records={records.map((record) => ({
            id: record.id,
            source: record.source,
            commodityName: record.commodityName,
            categoryName: record.categoryName,
            unit: record.unit,
            priceType: record.priceType,
            importedPriceRwf: record.importedPriceRwf,
            proposedAction: record.proposedAction,
            proposedSellingPriceRwf: record.proposedSellingPriceRwf,
            markupPercent: record.markupPercent,
            priceDate: record.priceDate?.toISOString() ?? null,
            importStatus: record.importStatus,
            matchStatus: record.matchStatus,
            reviewNote: record.reviewNote,
            matchedProductId: record.matchedProductId,
            matchedProduct: record.matchedProduct,
            suggestedCategoryId: categoryOptions.find((category) => category.name === record.categoryName)?.id ?? null,
          }))}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            priceRwf: product.units[0]?.priceRwf ?? null,
            unit: product.units[0]?.label ?? null,
          }))}
          categories={categoryOptions}
          page={page}
          pages={Math.max(1, Math.ceil(recordCount / PAGE_SIZE))}
          batchPendingCount={batchPendingCount}
        />
      </main>
      <OperationsPortalBadge role={`${admin.firstName} · Admin`} destination="/admin/login" />
    </>
  );
}

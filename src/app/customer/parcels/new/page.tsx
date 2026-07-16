import { BrowseHeader } from "@/components/catalog/browse-header";
import { ParcelBookingWizard } from "@/components/parcel/parcel-booking-wizard";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewParcelPage() {
  const customer = await requireRole("CUSTOMER");
  const [categories, sizes, prohibitedRules] = await Promise.all([
    db.parcelCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.parcelSizeDefinition.findMany({
      where: { isActive: true },
      select: {
        code: true,
        name: true,
        description: true,
        examplesJson: true,
        maxWeightKg: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.parcelProhibitedItemRule.findMany({
      where: { isActive: true },
      select: { title: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);
  return (
    <>
      <BrowseHeader />
      <ParcelBookingWizard
        customerName={`${customer.firstName} ${customer.lastName}`.trim()}
        customerPhone={customer.phone}
        categories={categories}
        sizes={sizes.map((size) => ({
          code: size.code,
          name: size.name,
          description: size.description,
          examples: parseExamples(size.examplesJson),
          maxWeightKg: size.maxWeightKg,
        }))}
        prohibitedRules={prohibitedRules.map((rule) => rule.title)}
      />
    </>
  );
}

function parseExamples(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

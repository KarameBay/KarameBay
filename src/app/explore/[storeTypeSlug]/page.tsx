import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { StoreTypeDirectory } from "@/components/catalog/explore-content";
import { PublicFooter } from "@/components/catalog/public-footer";
import { getActiveStoreTypes, getStores, getStoreTypeBySlug } from "@/lib/catalog";
import "../../explore.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ storeTypeSlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeTypeSlug } = await params;
  const storeType = await getStoreTypeBySlug(storeTypeSlug);
  return storeType
    ? { title: `${storeType.customerSectionName} | Karame Bay`, description: storeType.description }
    : { title: "Explore | Karame Bay" };
}

export default async function DynamicStoreTypePage({ params, searchParams }: Props) {
  const [{ storeTypeSlug }, { q = "" }] = await Promise.all([params, searchParams]);
  const query = q.trim().slice(0, 100);
  const [storeType, stores, activeTypes] = await Promise.all([
    getStoreTypeBySlug(storeTypeSlug),
    getStores(query, storeTypeSlug),
    getActiveStoreTypes(),
  ]);
  if (!storeType) notFound();
  const fullStoreType = activeTypes.find((type) => type.id === storeType.id);
  if (!fullStoreType) notFound();

  return (
    <div className="app-shell">
      <BrowseHeader />
      <StoreTypeDirectory storeType={fullStoreType} stores={stores} query={query} />
      <PublicFooter />
    </div>
  );
}

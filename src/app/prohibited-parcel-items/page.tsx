import { SupportDocument } from "@/components/support/support-document";
import { prohibitedSections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="PROHIBITED PARCEL ITEMS" title="Items we cannot carry" summary="Review these restrictions before booking any parcel with {business}." sections={prohibitedSections} />; }

import { SupportDocument } from "@/components/support/support-document";
import { parcelPolicySections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="PARCEL DELIVERY POLICY" title="Safe parcel delivery rules" summary="The booking, packaging, pickup, and handover rules for parcels carried by {business}." sections={parcelPolicySections} />; }

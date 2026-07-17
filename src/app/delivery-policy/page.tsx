import { SupportDocument } from "@/components/support/support-document";
import { deliverySections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="DELIVERY POLICY" title="Store order delivery policy" summary="How {business} routes, tracks, and completes restaurant and market deliveries." sections={deliverySections} />; }

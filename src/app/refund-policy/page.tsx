import { SupportDocument } from "@/components/support/support-document";
import { refundSections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="REFUND POLICY" title="Refund review and eligibility" summary="How {business} reviews refund requests against order and payment records." sections={refundSections} />; }

import { SupportDocument } from "@/components/support/support-document";
import { privacySections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="PRIVACY POLICY" title="Your information and privacy" summary="How {business} handles information needed to provide safe marketplace and delivery services." sections={privacySections} />; }

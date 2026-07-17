import { SupportDocument } from "@/components/support/support-document";
import { termsSections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="TERMS & CONDITIONS" title="Terms of service" summary="The basic responsibilities and conditions for using {business}." sections={termsSections} />; }

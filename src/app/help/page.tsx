import { SupportDocument } from "@/components/support/support-document";
import { helpSections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="HELP CENTER" title="Help & Support" summary="Find quick guidance or contact {business} for personal assistance." sections={helpSections} />; }

import { SupportDocument } from "@/components/support/support-document";
import { faqSections } from "@/lib/support-content";
export const dynamic = "force-dynamic";
export default function Page() { return <SupportDocument kicker="FREQUENTLY ASKED QUESTIONS" title="Answers to common questions" summary="Clear answers about ordering, delivery, accounts, payments, and reviews on {business}." sections={faqSections} />; }

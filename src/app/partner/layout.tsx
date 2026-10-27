import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { partnerPortalEnabled } from "@/lib/portal-surface";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default function PartnerLayout({ children }: { children: ReactNode }) {
  if (!partnerPortalEnabled()) notFound();
  return children;
}

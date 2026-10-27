import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Store, ArrowRight } from "lucide-react";
import { partnerPortalEnabled } from "@/lib/portal-surface";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Staff portal",
  robots: { index: false, follow: false },
};
export default function StaffSignInPage() {
  if (!partnerPortalEnabled()) notFound();
  return (
    <main className="staff-entry">
      <Link href="/staff" className="partner-brand">
        Karame<b>Bay</b>
      </Link>
      <span className="catalog-kicker">STAFF & PARTNER PORTAL</span>
      <h1>Welcome to your workspace.</h1>
      <p>Choose how you want to sign in.</p>
      <div className="staff-entry-options">
        <Link href="/admin/login">
          <ShieldCheck size={32} />
          <h2>Admin</h2>
          <p>Manage stores, partners, products and deliveries.</p>
          <span>
            Sign in as Admin <ArrowRight size={18} />
          </span>
        </Link>
        <Link href="/partner/login">
          <Store size={32} />
          <h2>Partner</h2>
          <p>Manage your own store, products and availability.</p>
          <span>
            Sign in as Partner <ArrowRight size={18} />
          </span>
        </Link>
      </div>
      <p>
        New partner?{" "}
        <Link href="/partner/register">Create a partner account</Link>
      </p>
      <Link href="/rider/login">Driver sign in</Link>
    </main>
  );
}

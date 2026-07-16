"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MailCheck } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export function EmailVerificationForm({ email, initialMessage }: { email: string; initialMessage?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  async function verify(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const body = await response.json().catch(() => ({})); setLoading(false);
    if (!response.ok) return setError(body.error ?? "Verification failed.");
    router.replace(body.redirectTo ?? "/customer/account"); router.refresh();
  }
  async function resend() {
    setResending(true); setError(""); setMessage("");
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const body = await response.json().catch(() => ({})); setResending(false);
    if (!response.ok) return setError(body.error ?? "Could not resend the code.");
    setCode(""); setMessage("A new code was sent. The previous code no longer works.");
  }
  return (
    <main className="email-verification-page"><section className="email-verification-card">
      <span className="email-verification-icon"><MailCheck /></span><span className="catalog-kicker">VERIFY YOUR EMAIL</span>
      <h1>Check your inbox</h1><p>Enter the 6-digit code sent to <b>{email}</b>. It expires after 10 minutes.</p>
      <form onSubmit={verify}><label htmlFor="verification-code">Verification code</label>
        <input id="verification-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required autoFocus />
        {message && <p className="verification-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={loading || code.length !== 6}>{loading ? <LoaderCircle className="spin" /> : "Verify email"}</button>
      </form>
      <button className="verification-resend" onClick={resend} disabled={resending}>{resending ? "Sending…" : "Resend code"}</button>
      <p className="verification-warning">Never share this code with anyone.</p><LogoutButton role="CUSTOMER" destination="/customer/login" />
    </section></main>
  );
}

"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { customerUrl } from "@/lib/portal-urls";

type ResetMode = "request" | "reset";

function PasswordResetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen password-reset-screen">
      <div className="auth-brand">
        <Link href={customerUrl("/")} className="auth-logo">
          <Image
            src="/images/karame-transport-logo.jpeg"
            width={56}
            height={56}
            alt="Karame Bay logo"
            priority
          />
          Karame<b>Bay</b>
        </Link>
        <div>
          <span className="kicker">SECURE ACCOUNT RECOVERY</span>
          <h1>
            Get back to
            <br />
            your deliveries.
          </h1>
          <p>
            Reset your password securely, then continue ordering from Karame Bay.
          </p>
        </div>
        <small>© 2026 Karame Bay · Made in Rwanda</small>
      </div>
      <main className="auth-main">{children}</main>
    </div>
  );
}

function ResetProgress({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Request code", "Verify code", "New password"];

  return (
    <ol className="reset-progress" aria-label="Password reset progress">
      {labels.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const complete = step < current;
        return (
          <li
            key={label}
            className={step === current ? "is-current" : complete ? "is-complete" : ""}
            aria-current={step === current ? "step" : undefined}
          >
            <span>{complete ? <CheckCircle2 /> : step}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function PasswordResetForm({
  mode,
  initialEmail = "",
}: {
  mode: ResetMode;
  initialEmail?: string;
}) {
  const requesting = mode === "request";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(requesting ? 0 : 60);
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function postJson(path: string, payload: Record<string, string>) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      return { response, body };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (requesting) {
        const { response, body } = await postJson("/api/auth/forgot-password", {
          email: normalizedEmail,
        });
        if (!response.ok) {
          setError(body.error ?? "We could not send the reset code. Please try again.");
          return;
        }
        router.push(
          `/customer/reset-password?email=${encodeURIComponent(normalizedEmail)}`,
        );
        return;
      }

      if (!codeVerified) {
        const { response, body } = await postJson("/api/auth/verify-reset-code", {
          email: normalizedEmail,
          code,
        });
        if (!response.ok) {
          setError(body.error ?? "The code is invalid or expired.");
          return;
        }
        setCodeVerified(true);
        setNotice("Code verified. Create your new password below.");
        return;
      }

      const form = new FormData(event.currentTarget);
      const password = String(form.get("password") ?? "");
      const confirmPassword = String(form.get("confirmPassword") ?? "");
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }

      const { response, body } = await postJson("/api/auth/reset-password", {
        email: normalizedEmail,
        code,
        password,
        confirmPassword,
      });
      if (!response.ok) {
        setError(body.error ?? "We could not reset your password. Please try again.");
        return;
      }
      setComplete(true);
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "The request took too long. Please try again."
          : "Could not connect to Karame Bay. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (loading || resendCooldown > 0) return;
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const { response, body } = await postJson("/api/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      if (!response.ok) {
        setError(body.error ?? "We could not resend the code. Please try again.");
        return;
      }
      setCode("");
      setCodeVerified(false);
      setResendCooldown(60);
      setNotice("A new code has been requested. Check your inbox and spam folder.");
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "The request took too long. Please try again."
          : "Could not connect to Karame Bay. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (complete) {
    return (
      <PasswordResetLayout>
        <div className="auth-card reset-success-card">
          <span className="reset-success-icon" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <span className="kicker">PASSWORD UPDATED</span>
          <h2>Your password is ready</h2>
          <p>You can now sign in to your customer account with your new password.</p>
          <Link
            className="auth-submit auth-submit-link"
            href={customerUrl("/customer/login")}
          >
            Continue to sign in <ArrowRight />
          </Link>
        </div>
      </PasswordResetLayout>
    );
  }

  const currentStep: 1 | 2 | 3 = requesting ? 1 : codeVerified ? 3 : 2;
  const title = requesting
    ? "Reset your password"
    : codeVerified
      ? "Create a new password"
      : "Verify your reset code";

  return (
    <PasswordResetLayout>
      <div className="auth-card password-reset-card">
        <Link className="reset-back-link" href={customerUrl("/customer/login")}>
          <ArrowLeft /> Back to sign in
        </Link>
        <ResetProgress current={currentStep} />
        <span className="reset-form-icon" aria-hidden="true">
          {requesting ? <Mail /> : codeVerified ? <CheckCircle2 /> : <ShieldCheck />}
        </span>
        <span className="kicker">
          {requesting
            ? "FORGOT PASSWORD"
            : codeVerified
              ? "CODE VERIFIED"
              : "EMAIL VERIFICATION"}
        </span>
        <h2>{title}</h2>
        <p>
          {requesting
            ? "Enter your customer email. If an active account matches, we will send a secure six-digit reset code. Check your inbox and spam folder."
            : codeVerified
              ? "Your code is correct. Choose a strong password for your account."
              : `Enter the six-digit code sent to ${email || "your email"}. It expires after 10 minutes.`}
        </p>

        <form onSubmit={submit}>
          {requesting && (
            <>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <p className="reset-account-note">
                Deleted accounts cannot receive reset codes. Create a new customer
                account if the old account was deleted.
              </p>
            </>
          )}

          {!requesting && !codeVerified && (
            <label>
              Six-digit reset code
              <input
                className="reset-code-input"
                name="code"
                required
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                autoFocus
              />
            </label>
          )}

          {!requesting && codeVerified && (
            <>
              <div className="reset-verified-notice">
                <CheckCircle2 aria-hidden="true" />
                <span>
                  <strong>Code verified</strong>
                  {email}
                </span>
              </div>
              <label>
                New password
                <div className="password">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <small className="password-guidance">
                  Use at least 10 characters with uppercase, lowercase, and a number.
                </small>
              </label>
              <label>
                Confirm new password
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
              </label>
            </>
          )}

          {notice && (
            <div className="form-success" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button className="auth-submit" disabled={loading || (!requesting && !codeVerified && code.length !== 6)}>
            {loading ? (
              <LoaderCircle className="spin" />
            ) : (
              <>
                {requesting
                  ? "Send reset code"
                  : codeVerified
                    ? "Save new password"
                    : "Verify code"}
                <ArrowRight />
              </>
            )}
          </button>
        </form>

        {!requesting && !codeVerified && (
          <div className="reset-code-actions">
            <span>Did not receive the email?</span>
            <button
              type="button"
              onClick={resendCode}
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Resend code"}
            </button>
            <Link href={customerUrl("/customer/forgot-password")}>Use another email</Link>
          </div>
        )}
      </div>
    </PasswordResetLayout>
  );
}

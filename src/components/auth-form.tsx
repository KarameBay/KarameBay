"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { customerUrl } from "@/lib/portal-urls";
import { roleLandingPath, type Role } from "@/lib/auth/constants";

type Audience = "customer" | "staff";
type Portal = "customer" | "admin" | "rider";

export function AuthForm({
  mode,
  audience = "customer",
  portal,
  initialError = "",
}: {
  mode: "login" | "register";
  audience?: Audience;
  portal?: Portal;
  initialError?: string;
}) {
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const staff = audience === "staff";
  const activePortal: Portal = portal ?? (staff ? "admin" : "customer");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    let navigating = false;

    try {
      const data = {
        ...Object.fromEntries(new FormData(event.currentTarget)),
        ...(mode === "login" ? { audience } : {}),
      };
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        ...(mode === "login"
          ? {
              headers: {
                accept: "application/json",
                "content-type": "application/json",
              },
              body: JSON.stringify(data),
            }
          : {
              headers: { accept: "application/json" },
              body: new FormData(event.currentTarget),
            }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      const role = body.user?.role as Role | undefined;
      const redirectTo =
        body.user?.redirectTo ??
        (role ? roleLandingPath(role) : activePortal === "customer" ? "/customer/account" : activePortal === "rider" ? "/rider" : "/admin");
      navigating = true;
      startTransition(() => router.replace(redirectTo));
    } catch (requestError) {
      setError(
        requestError instanceof DOMException &&
          requestError.name === "AbortError"
          ? `${mode === "register" ? "Registration" : "Sign in"} took too long. Please try again.`
          : "Could not connect to Karame Bay. Please try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (!navigating) setLoading(false);
    }
  }

  return (
    <div className={`auth-screen ${staff ? "operations-auth" : ""}`}>
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
          <span className="kicker">
            {staff ? "KARAME STAFF PORTAL" : "KIGALI, DELIVERED"}
          </span>
          <h1>
            {staff ? "One team," : "Everything you need,"}
            <br />
            {staff ? "one delivery mission." : "right at your door."}
          </h1>
          <p>
            {staff
              ? "Secure access for administrators and riders."
              : "Local restaurants, trusted markets, and reliable Karame delivery—all in one place."}
          </p>
        </div>
        <small>© 2026 Karame Bay · Made in Rwanda</small>
      </div>
      <main className="auth-main">
        <div className="auth-card">
          <span className="kicker">
            {staff
              ? activePortal === "rider"
                ? "RIDER PORTAL"
                : "ADMIN PORTAL"
              : mode === "login"
                ? "CUSTOMER PORTAL"
                : "JOIN KARAME BAY"}
          </span>
          <h2>
            {mode === "login"
              ? staff
                ? activePortal === "rider"
                  ? "Open your rider workspace"
                  : "Open your admin workspace"
                : "Sign in to your account"
              : "Create your account"}
          </h2>
          <p>
            {mode === "login"
              ? staff
                ? activePortal === "rider"
                  ? "For rider accounts only."
                  : "For admin accounts only."
                : "Enter your customer details to continue."
              : "Start ordering from Kigali's local favourites."}
          </p>
          <form
            onSubmit={submit}
            method="post"
            action={mode === "login" ? "/api/auth/login" : "/api/auth/register"}
          >
            {mode === "login" && (
              <input type="hidden" name="audience" value={audience} />
            )}
            {mode === "login" && (
              <input type="hidden" name="portal" value={activePortal} />
            )}
            {mode === "register" && (
              <label>
                Full name
                <input name="fullName" required minLength={3} autoComplete="name" />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            {mode === "register" && (
              <label>
                Phone number
                <input
                  name="phone"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="0788123456"
                />
              </label>
            )}
            <label>
              Password
              <div className="password">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={mode === "register" ? 10 : 1}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label="Show password"
                >
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            {mode === "login" && !staff && (
              <div className="auth-forgot-link">
                <Link href={customerUrl("/customer/forgot-password")}>Forgot password?</Link>
              </div>
            )}
            {mode === "register" && (
              <>
                <label>
                  Confirm password
                  <input
                    name="confirmPassword"
                    type={show ? "text" : "password"}
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  Profile photo <small>(optional)</small>
                  <input
                    name="profilePhoto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </label>
              </>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="auth-submit" disabled={loading}>
              {loading || isPending ? (
                <LoaderCircle className="spin" />
              ) : (
                <>
                  {mode === "login"
                    ? staff
                      ? activePortal === "rider"
                        ? "Enter Rider Portal"
                        : "Enter Admin Portal"
                      : "Customer sign in"
                    : "Create customer account"}
                  <ArrowRight />
                </>
              )}
            </button>
          </form>
          <div className="auth-switch">
            {staff ? (
              <>
                Shopping with Karame Bay?{" "}
                <Link href={customerUrl("/customer/login")}>
                  Customer sign in
                </Link>
              </>
            ) : mode === "login" ? (
              <>
                New to Karame Bay?{" "}
                <Link href={customerUrl("/customer/register")}>
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href={customerUrl("/customer/login")}>Sign in</Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


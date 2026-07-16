"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";

export function CustomerProfileForm({ user }: { user: { firstName: string; lastName: string; email: string; phone: string; emailVerified: boolean; profilePhotoUrl: string | null } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/customer/profile", { method: "PATCH", body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({})); setSaving(false);
    if (!response.ok) return setError(body.error ?? "Could not update your profile.");
    if (body.redirectTo) return router.replace(body.redirectTo);
    setMessage("Profile updated."); router.refresh();
  }
  return (
    <form className="customer-profile-form" onSubmit={submit}>
      <div className="profile-verification-row"><span>Email status</span><b className={user.emailVerified ? "verified" : "unverified"}>{user.emailVerified ? "Verified" : "Unverified"}</b></div>
      <label>Full name<input name="fullName" defaultValue={`${user.firstName} ${user.lastName}`} required /></label>
      <label>Email address<input name="email" type="email" defaultValue={user.email} required /><small>Changing your email requires verification.</small></label>
      <label>Phone number<input name="phone" inputMode="tel" defaultValue={user.phone} required /><small>Stored securely as +2507XXXXXXXX. No SMS verification is required.</small></label>
      <label>Profile photo <small>(optional)</small><input name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      {user.profilePhotoUrl && <Image className="customer-profile-photo" src={user.profilePhotoUrl} alt="Current profile" width={96} height={96} />}
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="verification-success">{message}</p>}
      <button className="auth-submit" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <><Save /> Save profile</>}</button>
    </form>
  );
}

"use client";

import { Building2, LoaderCircle, Save } from "lucide-react";
import { FormEvent, useState } from "react";

type Profile = {
  businessName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  businessAddress: string;
  businessHours: string;
  instagramUrl: string | null;
};

export function AdminBusinessProfileForm({ profile }: { profile: Profile }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/settings/business", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setPending(false);
    setMessage(
      response.ok
        ? "Business profile saved. Public support details are now updated."
        : result.error ?? "Could not save the business profile.",
    );
  }

  return (
    <section className="admin-settings-card" id="business-profile">
      <div className="admin-settings-section-heading">
        <span><Building2 /></span>
        <div>
          <span className="catalog-kicker">SINGLE SOURCE OF TRUTH</span>
          <h2>Business profile</h2>
          <p>These details power the footer, support pages, WhatsApp links, and customer emails.</p>
        </div>
      </div>
      <form className="business-profile-form" onSubmit={submit}>
        <label>Business name<input name="businessName" defaultValue={profile.businessName} required /></label>
        <label>Support email<input name="supportEmail" type="email" defaultValue={profile.supportEmail} required /></label>
        <label>Support phone<input name="supportPhone" defaultValue={profile.supportPhone} placeholder="07XXXXXXXX" required /></label>
        <label>WhatsApp number<input name="whatsappNumber" defaultValue={profile.whatsappNumber} placeholder="07XXXXXXXX" required /></label>
        <label className="wide">Business address<input name="businessAddress" defaultValue={profile.businessAddress} required /></label>
        <label className="wide">Business hours<input name="businessHours" defaultValue={profile.businessHours} required /></label>
        <label className="wide">Instagram URL<input name="instagramUrl" type="url" defaultValue={profile.instagramUrl ?? ""} /></label>
        <button type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Save />}Save business profile</button>
        {message && <p className="business-profile-message" role="status">{message}</p>}
      </form>
    </section>
  );
}

"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";

export function AdminTestEmailForm({
  defaultRecipient = "test@example.com",
}: {
  defaultRecipient?: string;
}) {
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/settings/test-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            recipientEmail: recipientEmail.trim() || undefined,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error ?? "Test email failed.");
          return;
        }
        setMessage(`Test email sent to ${data.recipientEmail}.`);
      } catch {
        setError("Could not send the test email.");
      }
    });
  }

  return (
    <form className="admin-test-email" onSubmit={submit}>
      <label>
        Recipient email
        <input
          type="email"
          value={recipientEmail}
          onChange={(event) => setRecipientEmail(event.target.value)}
          placeholder="name@example.com"
        />
      </label>
      {error && <p className="admin-test-email-error">{error}</p>}
      {message && <p className="admin-test-email-success">{message}</p>}
      <button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="spin" /> : <MailCheck />}
        Send test email
      </button>
    </form>
  );
}

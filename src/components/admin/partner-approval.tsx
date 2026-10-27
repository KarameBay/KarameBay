"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function PartnerApproval({
  stores,
}: {
  stores: {
    id: string;
    name: string;
    status: string;
    description: string;
    address: string;
    phone: string | null;
    ownerName: string;
    email: string;
    type: string;
    productCount: number;
  }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function review(storeId: string, status: string) {
    setBusy(storeId);
    setError("");
    try {
      const response = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId, status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update store.");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="partner-approval">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!stores.length && (
        <p>
          No partner stores yet. Partners can register at /partner/register.
        </p>
      )}
      {stores.map((s) => (
        <article key={s.id}>
          <div className="partner-toolbar">
            <h2>{s.name}</h2>
            <span className={`partner-status ${s.status.toLowerCase()}`}>
              {s.status}
            </span>
          </div>
          <p>{s.description}</p>
          <p>
            <b>{s.ownerName}</b> · {s.email} · {s.phone}
          </p>
          <p>
            {s.type} · {s.address} · {s.productCount} products
          </p>
          <div className="partner-actions">
            <button
              disabled={
                !!busy || s.status === "APPROVED" || s.status === "ARCHIVED"
              }
              onClick={() => review(s.id, "APPROVED")}
            >
              Approve store
            </button>
            <button
              disabled={!!busy || s.status !== "PENDING"}
              onClick={() => review(s.id, "REJECTED")}
            >
              Reject
            </button>
            <button
              disabled={!!busy || s.status !== "APPROVED"}
              onClick={() => review(s.id, "SUSPENDED")}
            >
              Suspend
            </button>
            <Link href="/admin/products">Retail catalog</Link>
            <Link href="/admin/menus">Restaurant menus</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

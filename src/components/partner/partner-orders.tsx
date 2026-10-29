"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, PackageCheck, XCircle } from "lucide-react";
import { formatRwf } from "@/lib/money";

type PartnerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotalRwf: number;
  createdAt: string;
  customer: { firstName: string; lastName: string; phone: string | null };
  store: { id: string; name: string };
  payment: { status: string } | null;
  items: { id: string; productName: string; quantity: number; lineTotalRwf: number }[];
  rider: { firstName: string; lastName: string; phone: string | null } | null;
};

const nextActions: Record<string, { status: string; label: string }[]> = {
  PENDING: [{ status: "REJECTED", label: "Reject" }],
  ACCEPTED: [{ status: "PREPARING", label: "Start preparing" }],
  PREPARING: [{ status: "READY_FOR_PICKUP", label: "Ready for pickup" }],
};

export function PartnerOrders() {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/partner/orders", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load orders.");
      setOrders(body.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function update(orderId: string, status: string) {
    setBusy(`${orderId}:${status}`);
    setError("");
    try {
      const response = await fetch("/api/partner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not update order.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update order.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="partner-orders" aria-labelledby="partner-orders-title">
      <div className="partner-section-heading">
        <div>
          <span className="catalog-kicker">CUSTOMER ORDERS</span>
          <h2 id="partner-orders-title">Orders to prepare</h2>
        </div>
        <button className="partner-secondary-button" onClick={() => void load()} type="button">Refresh</button>
      </div>
      {error && <div className="partner-inline-error" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></div>}
      {loading ? <p className="partner-muted" role="status" aria-live="polite">Loading orders…</p> : orders.length === 0 ? <div className="partner-empty"><PackageCheck /><h3>No orders to prepare yet</h3><p>New customer orders for your stores will appear here. Keep this page open to respond quickly.</p><button type="button" className="partner-secondary-button" onClick={() => void load()}>Refresh orders</button></div> : (
        <div className="partner-order-list">
          {orders.map((order) => (
            <article className="partner-order-card" key={order.id}>
              <div className="partner-order-card-header">
                <div><b>{order.orderNumber}</b><small>{order.store.name} · {new Date(order.createdAt).toLocaleString("en-RW")}</small></div>
                <span className={`partner-order-status status-${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span>
              </div>
              <p className="partner-order-customer">Customer: {order.customer.firstName} {order.customer.lastName} {order.customer.phone ? `· ${order.customer.phone}` : ""}</p>
              <ul>{order.items.map((item) => <li key={item.id}>{item.quantity} × {item.productName} <span>{formatRwf(item.lineTotalRwf)}</span></li>)}</ul>
              <div className="partner-order-footer"><strong>{formatRwf(order.grandTotalRwf)}</strong><span>Payment: {order.payment?.status ?? "Pending"}</span>{order.rider && <span>Rider: {order.rider.firstName} {order.rider.lastName}</span>}</div>
              <div className="partner-order-actions">
                {order.status === "PENDING" && <button disabled={busy.length > 0} onClick={() => void update(order.id, "ACCEPTED")} type="button"><CheckCircle2 /> Accept order</button>}
                {nextActions[order.status]?.map((action) => <button disabled={busy.length > 0} key={action.status} onClick={() => void update(order.id, action.status)} type="button">{action.status === "REJECTED" ? <XCircle /> : action.status === "READY_FOR_PICKUP" ? <PackageCheck /> : <Clock3 />}{busy === `${order.id}:${action.status}` ? "Saving…" : action.label}</button>)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

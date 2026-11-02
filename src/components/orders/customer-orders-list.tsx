"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { formatRwf } from "@/lib/money";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import { formatKigaliDateTime } from "@/lib/date-format";

export type CustomerOrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotalRwf: number;
  createdAt: string;
  store: { name: string };
  payment: { status: string } | null;
  review: { id: string; editableUntil: string | null } | null;
  _count: { items: number };
};

function isPastOrder(status: string) {
  return status === "DELIVERED" || status === "CANCELLED" || status === "REJECTED";
}

export function CustomerOrdersList({ initialOrders }: { initialOrders: CustomerOrderListItem[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<"active" | "history">(
    initialOrders.length === 0 || initialOrders.some((order) => !isPastOrder(order.status))
      ? "active"
      : "history",
  );
  const [refreshError, setRefreshError] = useState<"" | "session" | "connection">("");
  const [refreshing, setRefreshing] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    async function refresh() {
      if (!active || document.hidden || inFlight) return;
      inFlight = true;
      setRefreshing(true);
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/orders", {
          cache: "no-store",
          signal: request.signal,
        });
        if (response.status === 401) {
          if (active) setRefreshError("session");
          return;
        }
        if (!response.ok) throw new Error("Order refresh failed");
        const data = await response.json();
        if (!Array.isArray(data.orders)) throw new Error("Invalid order response");
        if (active) {
          setOrders(data.orders);
          setRefreshError("");
        }
      } catch {
        if (active && !request.signal.aborted) setRefreshError("connection");
      } finally {
        inFlight = false;
        controller = null;
        if (active) setRefreshing(false);
      }
    }
    if (retry) void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      controller?.abort();
    };
  }, [retry]);

  const activeCount = orders.filter((order) => !isPastOrder(order.status)).length;
  const historyCount = orders.length - activeCount;
  const visibleOrders = orders.filter((order) =>
    filter === "active" ? !isPastOrder(order.status) : isPastOrder(order.status),
  );

  return (
    <div className="customer-orders">
      <header>
        <div>
          <span className="catalog-kicker">MY KARAME BAY</span>
          <h1>My orders</h1>
          <p>Track your current orders and review previous deliveries.</p>
        </div>
        <div><Link href="/stores">Browse stores</Link></div>
      </header>
      {refreshError && (
        <div className="customer-orders-refresh-error" role="status">
          <span>{refreshError === "session" ? "Sign in again to see the latest order updates." : "Could not load the latest order updates. Your current list is still shown."}</span>
          {refreshError === "session" ? (
            <Link href="/customer/login">Sign in</Link>
          ) : (
            <button type="button" onClick={() => setRetry((value) => value + 1)} disabled={refreshing}>
              <RefreshCw /> Retry
            </button>
          )}
        </div>
      )}
      {orders.length > 0 && (
        <div className="customer-orders-filters" role="group" aria-label="Filter orders">
          <button type="button" className={filter === "active" ? "active" : ""} aria-pressed={filter === "active"} onClick={() => setFilter("active")}>
            Active <span>{activeCount}</span>
          </button>
          <button type="button" className={filter === "history" ? "active" : ""} aria-pressed={filter === "history"} onClick={() => setFilter("history")}>
            Past orders <span>{historyCount}</span>
          </button>
        </div>
      )}
      <section>
        {visibleOrders.length ? (
          visibleOrders.map((order) => (
            <article key={order.id}>
              <div>
                <small>{order.orderNumber}</small>
                <h2>{order.store.name}</h2>
                <p>
                  {formatKigaliDateTime(order.createdAt)} · {order._count.items} {order._count.items === 1 ? "item" : "items"}
                </p>
              </div>
              <div>
                <span className="customer-status">{orderStatusLabel(order.status)}</span>
                <small>{paymentStatusLabel(order.payment?.status ?? "UNKNOWN")}</small>
              </div>
              <b>{formatRwf(order.grandTotalRwf)}</b>
              <div className="customer-order-actions">
                <Link href={`/orders/${order.orderNumber}`} aria-label={`View details for order ${order.orderNumber}`}>View details</Link>
                <Link href={`/orders/${order.orderNumber}/track`} aria-label={`Track order ${order.orderNumber}`}>Track order</Link>
                {order.status === "DELIVERED" && (
                  <Link href={`/customer/orders/${order.orderNumber}/review`}>
                    {order.review ? (order.review.editableUntil && new Date(order.review.editableUntil) > new Date() ? "Edit review" : "View review") : "Rate order"}
                  </Link>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="customer-no-orders">
            <h2>{orders.length ? (filter === "active" ? "No active orders" : "No past orders yet") : "No orders yet"}</h2>
            <p>{orders.length ? (filter === "active" ? "Your completed and cancelled orders are in Past orders." : "Current deliveries are in Active.") : "Your orders will appear here after checkout."}</p>
            {orders.length ? (
              <button type="button" onClick={() => setFilter(filter === "active" ? "history" : "active")}>
                View {filter === "active" ? "past orders" : "active orders"}
              </button>
            ) : (
              <Link href="/stores">Start shopping</Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

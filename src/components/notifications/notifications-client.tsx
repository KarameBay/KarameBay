"use client";

import Link from "next/link";
import { Bell, Check, CheckCheck, PackageCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { orderStatusLabel } from "@/lib/order-status";
import { parcelStatusLabel } from "@/components/parcel/parcel-status";
import { formatKigaliDateTime } from "@/lib/date-format";

type Portal = "customer" | "admin" | "rider";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  href: string;
  contextLabel: string;
  status: string;
};

export function NotificationsClient({
  initialNotifications,
  asPage = true,
  portal = "customer",
}: {
  initialNotifications: NotificationListItem[];
  asPage?: boolean;
  portal?: Portal;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState<"" | "session" | "connection">("");
  const savingRef = useRef(false);
  const mutationVersion = useRef(0);
  const unread = notifications.filter((item) => !item.readAt).length;
  const Wrapper: "main" | "div" = asPage ? "main" : "div";

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    async function refresh() {
      if (!active || document.hidden || inFlight || savingRef.current) return;
      inFlight = true;
      const version = mutationVersion.current;
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch(`/api/notifications?portal=${portal}&limit=50`, {
          cache: "no-store",
          signal: request.signal,
        });
        if (response.status === 401) {
          if (active && version === mutationVersion.current) setRefreshError("session");
          return;
        }
        if (!response.ok) throw new Error("Notification refresh failed");
        const data = await response.json();
        if (!Array.isArray(data.notifications)) throw new Error("Invalid notification response");
        if (active && version === mutationVersion.current && !savingRef.current) {
          setNotifications(data.notifications);
          setRefreshError("");
        }
      } catch {
        if (active && !request.signal.aborted && version === mutationVersion.current)
          setRefreshError("connection");
      } finally {
        inFlight = false;
        controller = null;
      }
    }
    const timer = window.setInterval(() => void refresh(), 20_000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      controller?.abort();
    };
  }, [portal]);

  async function markRead(id?: string) {
    if (savingRef.current) return;
    savingRef.current = true;
    mutationVersion.current += 1;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/notifications?portal=${portal}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          id ? { action: "MARK_READ", id } : { action: "MARK_ALL_READ" },
        ),
      });
      if (!response.ok) throw new Error("Could not mark the update as read.");
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) =>
          !id || item.id === id
            ? { ...item, readAt: item.readAt ?? now }
            : item,
        ),
      );
    } catch {
      setError("Could not mark the update as read. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function deleteNotification(id: string) {
    if (savingRef.current) return;
    savingRef.current = true;
    mutationVersion.current += 1;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(id)}?portal=${portal}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Could not delete the update.");
      setNotifications((current) => current.filter((item) => item.id !== id));
    } catch {
      setError("Could not delete the update. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Wrapper className={`notifications-page ${asPage ? "" : "notifications-embedded"}`}>
      <header>
        <div>
          <span className="catalog-kicker">ACCOUNT UPDATES</span>
          <h1>Notifications</h1>
          <p>
            {unread
              ? `${unread} unread update${unread === 1 ? "" : "s"}`
              : "You are all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={() => void markRead()} disabled={saving}>
            <CheckCheck /> Mark all as read
          </button>
        )}
      </header>
      {error && <p className="notifications-error" role="alert">{error}</p>}
      {refreshError && (
        <p className="notifications-refresh-error" role="status">
          {refreshError === "session" ? (
            <>Your session expired. <Link href={portal === "admin" ? "/admin/login" : portal === "rider" ? "/rider/login" : "/customer/login"}>Sign in</Link> to see new updates.</>
          ) : (
            "New updates are temporarily unavailable. Your last known notifications are shown; we will retry automatically."
          )}
        </p>
      )}
      {notifications.length ? (
        <section className="notifications-list">
          {notifications.map((notification) => {
            const isParcel = notification.id.startsWith("parcel:");
            return (
              <article
                className={notification.readAt ? "" : "unread"}
                key={notification.id}
              >
                <span>{isParcel ? <PackageCheck /> : <Bell />}</span>
                <div>
                  <small>{notification.contextLabel}</small>
                  <h2>{notification.title}</h2>
                  <p>{notification.message}</p>
                  <em>{formatKigaliDateTime(notification.createdAt)}</em>
                </div>
                <aside>
                  <b>
                    {isParcel
                      ? parcelStatusLabel(notification.status)
                      : orderStatusLabel(notification.status)}
                  </b>
                  <Link href={notification.href}>
                    {isParcel ? "Open parcel" : "Open order"}
                  </Link>
                  {!notification.readAt && (
                    <button onClick={() => void markRead(notification.id)} disabled={saving} aria-label={`Mark ${notification.title} as read`}>
                      <Check /> Mark read
                    </button>
                  )}
                  <button onClick={() => void deleteNotification(notification.id)} disabled={saving} aria-label={`Delete ${notification.title}`}>
                    Delete
                  </button>
                </aside>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="notifications-empty">
          <Bell />
          <h2>No notifications yet</h2>
          <p>Order and parcel delivery updates will appear here.</p>
          {portal === "customer" && <Link href="/stores">Browse stores</Link>}
        </section>
      )}
    </Wrapper>
  );
}

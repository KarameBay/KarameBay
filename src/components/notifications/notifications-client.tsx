"use client";

import Link from "next/link";
import { Bell, Check, CheckCheck, PackageCheck } from "lucide-react";
import { useState } from "react";
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
  const unread = notifications.filter((item) => !item.readAt).length;
  const Wrapper: "main" | "div" = asPage ? "main" : "div";

  async function markRead(id?: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/notifications?portal=${portal}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          id ? { action: "MARK_READ", id } : { action: "MARK_ALL_READ" },
        ),
      });
      if (!response.ok) return;
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) =>
          !id || item.id === id
            ? { ...item, readAt: item.readAt ?? now }
            : item,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotification(id: string) {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(id)}?portal=${portal}`,
        { method: "DELETE" },
      );
      if (!response.ok) return;
      setNotifications((current) => current.filter((item) => item.id !== id));
    } finally {
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
      {notifications.length ? (
        <section className="notifications-list">
          {notifications.map((notification) => {
            const isParcel = notification.id.startsWith("parcel:");
            return (
              <article
                className={notification.readAt ? "" : "unread"}
                key={notification.id}
              >
                <span><PackageCheck /></span>
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
                    <button onClick={() => void markRead(notification.id)} disabled={saving}>
                      <Check /> Mark read
                    </button>
                  )}
                  <button onClick={() => void deleteNotification(notification.id)} disabled={saving}>
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
          {portal === "customer" && <Link href="/customer">Back to home</Link>}
        </section>
      )}
    </Wrapper>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Portal = "customer" | "admin" | "rider";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  href: string;
  contextLabel: string;
  status: string;
};

function portalFromPath(pathname: string): Portal {
  if (pathname.startsWith("/rider")) return "rider";
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin"))
    return "admin";
  return "customer";
}

export function NotificationBell({
  className = "",
  href,
  portal,
}: {
  className?: string;
  href?: string;
  portal?: Portal;
}) {
  const pathname = usePathname();
  const activePortal = portal ?? portalFromPath(pathname);
  const notificationsHref =
    href ??
    (activePortal === "customer"
      ? "/customer/notifications"
      : `/notifications?portal=${activePortal}`);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const loadedPortalRef = useRef<Portal | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/notifications?limit=8&portal=${activePortal}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  }, [activePortal]);

  useEffect(() => {
    if (!open || loadedPortalRef.current === activePortal) return;
    loadedPortalRef.current = activePortal;
    void load();
  }, [activePortal, load, open]);

  useEffect(() => {
    const idle = window.setTimeout(() => {
      if (loadedPortalRef.current !== activePortal) {
        loadedPortalRef.current = activePortal;
        void load();
      }
    }, 1_500);
    return () => window.clearTimeout(idle);
  }, [activePortal, load]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [open, load]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        panelRef.current &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(id?: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/notifications?portal=${activePortal}`, {
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
          !id || item.id === id ? { ...item, readAt: item.readAt ?? now } : item,
        ),
      );
      setUnreadCount((current) => (id ? Math.max(0, current - 1) : 0));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotification(id: string) {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(id)}?portal=${activePortal}`,
        { method: "DELETE" },
      );
      if (!response.ok) return;
      const removed = notifications.find((item) => item.id === id);
      setNotifications((current) => current.filter((item) => item.id !== id));
      if (removed && !removed.readAt) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } finally {
      setSaving(false);
    }
  }

  const preview = useMemo(() => notifications.slice(0, 4), [notifications]);

  return (
    <div className={`notification-bell ${className}`} ref={panelRef}>
      <button
        type="button"
        className="header-notifications"
        aria-label="Notifications"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell />
        {unreadCount > 0 && <em>{Math.min(unreadCount, 99)}</em>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <div>
              <small>NOTIFICATIONS</small>
              <b>{unreadCount ? `${unreadCount} unread` : "All caught up"}</b>
            </div>
            <button type="button" onClick={() => void markRead()} disabled={saving}>
              <CheckCheck /> Mark all read
            </button>
          </div>
          {preview.length ? (
            <div className="notification-panel-list">
              {preview.map((item) => (
                <article key={item.id} className={item.readAt ? "" : "unread"}>
                  <div>
                    <small>{item.contextLabel}</small>
                    <b>{item.title}</b>
                    <p>{item.message}</p>
                  </div>
                  <div>
                    <Link href={item.href} onClick={() => setOpen(false)}>
                      Open
                    </Link>
                    {!item.readAt && (
                      <button type="button" onClick={() => void markRead(item.id)} disabled={saving}>
                        <Check /> Read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void deleteNotification(item.id)}
                      disabled={saving}
                    >
                      <X /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="notification-panel-empty">
              <Bell />
              <p>No notifications yet.</p>
            </div>
          )}
          <Link href={notificationsHref} className="notification-panel-footer">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

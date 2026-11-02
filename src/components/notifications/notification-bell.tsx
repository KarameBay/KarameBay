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
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const loadingRef = useRef(false);
  const savingRef = useRef(false);
  const mutationVersion = useRef(0);

  const load = useCallback(async () => {
    if (document.hidden || loadingRef.current || savingRef.current) return;
    loadingRef.current = true;
    const version = mutationVersion.current;
    try {
      const response = await fetch(
        `/api/notifications?limit=8&portal=${activePortal}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Notification refresh failed");
      const data = await response.json();
      if (!Array.isArray(data.notifications)) throw new Error("Invalid notifications");
      if (version === mutationVersion.current && !savingRef.current) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? 0);
        setError("");
      }
    } catch {
      if (version === mutationVersion.current) setError("Could not load the latest notifications. We will try again.");
    } finally {
      loadingRef.current = false;
    }
  }, [activePortal]);

  useEffect(() => {
    const idle = window.setTimeout(() => void load(), 1_500);
    const timer = window.setInterval(() => void load(), 30_000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(idle);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      bellRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function markRead(id?: string) {
    if (savingRef.current) return;
    savingRef.current = true;
    mutationVersion.current += 1;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/notifications?portal=${activePortal}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          id ? { action: "MARK_READ", id } : { action: "MARK_ALL_READ" },
        ),
      });
      if (!response.ok) throw new Error("Notification update failed");
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) =>
          !id || item.id === id ? { ...item, readAt: item.readAt ?? now } : item,
        ),
      );
      setUnreadCount((current) => (id ? Math.max(0, current - 1) : 0));
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
        `/api/notifications/${encodeURIComponent(id)}?portal=${activePortal}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Notification deletion failed");
      const removed = notifications.find((item) => item.id === id);
      setNotifications((current) => current.filter((item) => item.id !== id));
      if (removed && !removed.readAt) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch {
      setError("Could not delete the update. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const preview = useMemo(() => notifications.slice(0, 4), [notifications]);

  return (
    <div className={`notification-bell ${className}`} ref={panelRef}>
      <button
        ref={bellRef}
        type="button"
        className="header-notifications"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls="header-notification-panel"
        onClick={() => {
          if (!open) void load();
          setOpen(!open);
        }}
      >
        <Bell />
        {unreadCount > 0 && <em>{Math.min(unreadCount, 99)}</em>}
      </button>
      {open && (
        <div className="notification-panel" id="header-notification-panel" role="region" aria-label="Recent notifications">
          <div className="notification-panel-head">
            <div>
              <small>NOTIFICATIONS</small>
              <b>{unreadCount ? `${unreadCount} unread` : "All caught up"}</b>
            </div>
            <button type="button" onClick={() => void markRead()} disabled={saving || unreadCount === 0}>
              <CheckCheck /> Mark all read
            </button>
          </div>
          {error && <p className="notification-panel-error" role="status">{error}</p>}
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

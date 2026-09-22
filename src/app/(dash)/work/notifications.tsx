"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readNotificationsAction } from "@/app/actions/notifications";
import type { AppNotification } from "@/lib/types";
import { usePulse } from "../pulse";

const ICON: Record<string, string> = {
  announcement: "📣",
  blocker: "🚧",
  meeting_invite: "📅",
  meeting_update: "🔁",
  meeting_cancel: "✖",
  meeting_reminder: "⏰",
};

function ago(s: string) {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * What the bell counts, listed at the top of My work: unread first, each one
 * opening what it is about. Opening one marks it read; "Mark all as read"
 * clears the bell in one go.
 */
export default function NotificationsCard({ items, unread }: { items: AppNotification[]; unread: number }) {
  const router = useRouter();
  const { refresh } = usePulse();
  const [busy, start] = useTransition();
  const [showAll, setShowAll] = useState(false);

  const mark = (opts: { ids?: number[]; all?: boolean }, then?: string) =>
    start(async () => {
      await readNotificationsAction(opts);
      refresh();
      if (then) router.push(then);
      else router.refresh();
    });

  const shown = showAll ? items : items.filter((n) => !n.read).concat(items.filter((n) => n.read).slice(0, 5));

  return (
    <div className="card" id="notifications" style={{ marginBottom: 18, scrollMarginTop: 80 }}>
      <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {unread > 0 && <span className="pill s-disabled">{unread} new</span>}
        <div style={{ flex: 1 }} />
        {unread > 0 && (
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => mark({ all: true })}>
            Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty" style={{ padding: "12px 0", margin: 0 }}>
          Nothing yet. Meeting invites, reminders, announcements and blockers you are tagged on appear here.
        </p>
      ) : (
        <>
          <ul className="notif-list">
            {shown.map((n) => (
              <li key={n.id} className={`notif${n.read ? "" : " is-unread"}`}>
                <span className={`notif__icon k-${n.kind}`} aria-hidden="true">
                  {ICON[n.kind] ?? "🔔"}
                </span>
                <div className="notif__main">
                  <button type="button" className="notif__title" onClick={() => mark({ ids: [n.id] }, n.link || undefined)}>
                    {n.title}
                  </button>
                  {n.body && <div className="notif__body">{n.body}</div>}
                  <div className="notif__time">{ago(n.created_at)}</div>
                </div>
                {!n.read && <span className="notif__dot" title="Unread" />}
              </li>
            ))}
          </ul>
          {items.length > shown.length && (
            <button type="button" className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setShowAll(true)}>
              Show older ones
            </button>
          )}
        </>
      )}
    </div>
  );
}

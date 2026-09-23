"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readNotificationsAction } from "@/app/actions/notifications";
import type { AppNotification } from "@/lib/types";
import { usePulse } from "../pulse";

export const NOTIF_ICON: Record<string, string> = {
  announcement: "📣",
  blocker: "🚧",
  meeting_invite: "📅",
  meeting_update: "🔁",
  meeting_cancel: "✖",
  meeting_reminder: "⏰",
  machine_request: "⚙",
};

export function notifWhen(s: string) {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** One row, wherever notifications are listed. */
export function NotificationRow({
  n,
  onOpen,
  busy,
}: {
  n: AppNotification;
  onOpen: (n: AppNotification) => void;
  busy: boolean;
}) {
  return (
    <li className={`notif${n.read ? "" : " is-unread"}`}>
      <span className={`notif__icon k-${n.kind}`} aria-hidden="true">
        {NOTIF_ICON[n.kind] ?? "🔔"}
      </span>
      <div className="notif__main">
        <button type="button" className="notif__title" disabled={busy} onClick={() => onOpen(n)}>
          {n.title}
        </button>
        {n.body && <div className="notif__body">{n.body}</div>}
        <div className="notif__time">{notifWhen(n.created_at)}</div>
      </div>
      {!n.read && <span className="notif__dot" title="Unread" />}
    </li>
  );
}

/**
 * Every notification this person has, on its own page.
 *
 * My work shows only what is still live; the rest lives here, so a busy week
 * of invites and reminders never pushes someone's actual work off the screen.
 */
export default function NotificationList({ items, unread }: { items: AppNotification[]; unread: number }) {
  const router = useRouter();
  const { refresh } = usePulse();
  const [busy, start] = useTransition();
  const [only, setOnly] = useState<"all" | "unread">(unread > 0 ? "unread" : "all");

  const act = (opts: { ids?: number[]; all?: boolean }, then?: string) =>
    start(async () => {
      await readNotificationsAction(opts);
      refresh();
      if (then) router.push(then);
      else router.refresh();
    });

  const shown = only === "unread" ? items.filter((n) => !n.read) : items;

  return (
    <>
      <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={only === "unread" ? "on" : ""} onClick={() => setOnly("unread")}>
            Unread <span style={{ opacity: 0.7 }}>{unread}</span>
          </button>
          <button type="button" className={only === "all" ? "on" : ""} onClick={() => setOnly("all")}>
            Everything <span style={{ opacity: 0.7 }}>{items.length}</span>
          </button>
        </div>
        <div style={{ flex: 1 }} />
        {unread > 0 && (
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => act({ all: true })}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="card">
        {shown.length === 0 ? (
          <p className="empty" style={{ margin: 0 }}>
            {only === "unread" ? "Nothing unread. You are up to date." : "No notifications yet."}
          </p>
        ) : (
          <ul className="notif-list">
            {shown.map((n) => (
              <NotificationRow key={n.id} n={n} busy={busy} onOpen={(x) => act({ ids: [x.id] }, x.link || undefined)} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

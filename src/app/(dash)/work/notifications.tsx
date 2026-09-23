"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { readNotificationsAction } from "@/app/actions/notifications";
import type { AppNotification } from "@/lib/types";
import { usePulse } from "../pulse";
import { NotificationRow } from "../notifications/list";

/** How many live notifications the side panel shows before "see all". */
const PEEK = 3;

/**
 * The live end of the notification list, beside the working day rather than
 * above it.
 *
 * Only what is still unread shows here (and the newest one if everything has
 * been read), because a week of invites and reminders stacked on top of My
 * work pushed the actual work off the screen. The rest is on the
 * Notifications page.
 */
export default function NotificationsPeek({ items, unread }: { items: AppNotification[]; unread: number }) {
  const router = useRouter();
  const { refresh } = usePulse();
  const [busy, start] = useTransition();

  const live = items.filter((n) => !n.read).slice(0, PEEK);
  const shown = live.length > 0 ? live : items.slice(0, 1);
  const more = items.length - shown.length;

  const act = (opts: { ids?: number[]; all?: boolean }, then?: string) =>
    start(async () => {
      await readNotificationsAction(opts);
      refresh();
      if (then) router.push(then);
      else router.refresh();
    });

  return (
    <div className="card" id="notifications" style={{ scrollMarginTop: 80 }}>
      <div className="row" style={{ alignItems: "center", gap: 8, marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {unread > 0 && <span className="pill s-disabled">{unread} new</span>}
      </div>

      {shown.length === 0 ? (
        <p className="empty" style={{ margin: 0, padding: "10px 0" }}>
          Nothing waiting on you.
        </p>
      ) : (
        <ul className="notif-list">
          {shown.map((n) => (
            <NotificationRow key={n.id} n={n} busy={busy} onOpen={(x) => act({ ids: [x.id] }, x.link || undefined)} />
          ))}
        </ul>
      )}

      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Link href="/notifications" className="btn ghost sm">
          {more > 0 ? `See all ${items.length}` : "See all"}
        </Link>
        {unread > 0 && (
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => act({ all: true })}>
            Mark all as read
          </button>
        )}
      </div>
    </div>
  );
}

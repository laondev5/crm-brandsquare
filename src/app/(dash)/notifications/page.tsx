import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { listNotifications } from "@/lib/queries";
import NotificationList from "./list";

/** Everything the bell counts, in one place. */
export default async function NotificationsPage() {
  const me = await requireMember();
  const data = await listNotifications(me, 100).catch(() => ({ notifications: [], unread: 0 }));

  return (
    <>
      <div className="head">
        <h1>Notifications</h1>
        <div className="spacer" />
        <Link href="/work" className="btn ghost">
          My work
        </Link>
      </div>

      <p className="board-hint">
        Meeting invites, changes and reminders, announcements, machine requests assigned to you, and
        blockers someone tagged you on. Clicking one opens what it is about.
      </p>

      <NotificationList items={data.notifications} unread={data.unread} />
    </>
  );
}

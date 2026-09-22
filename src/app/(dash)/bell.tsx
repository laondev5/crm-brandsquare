"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePulse } from "./pulse";

/**
 * The bell: how many unread notifications this person has, at a glance, on
 * every page. It opens My work, where the notifications are listed.
 */
export default function NotificationBell() {
  const { unread } = usePulse();
  const label = unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "Notifications";
  return (
    <Link href="/work#notifications" className={`bell${unread ? " has-unread" : ""}`} aria-label={label} title={label}>
      <Bell size={18} strokeWidth={2} aria-hidden="true" />
      {unread > 0 && <span className="bell__count">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

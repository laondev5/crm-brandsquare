"use client";

import { useState } from "react";
import type { Workday } from "@/lib/types";

const MOOD: Record<string, string> = { good: "🙂 Good day", ok: "😐 Steady", rough: "😕 Rough one" };

function dayLabel(d: string) {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function clock(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Everything the team wrote when they signed out, newest first, to read
 * straight through. The chips narrow it to one person without leaving the
 * page; "Blockers only" is the shortcut to what needs a decision.
 */
export default function ReportsFeed({ reports }: { reports: Workday[] }) {
  const [who, setWho] = useState<number | "all">("all");
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  const people = [...new Map(reports.map((r) => [r.user_id, r.name ?? ""])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1])
  );
  const shown = reports.filter((r) => (who === "all" || r.user_id === who) && (!onlyBlocked || r.blockers));

  if (reports.length === 0) return <p className="empty">Nobody has written a daily report in this period.</p>;

  return (
    <>
      <div className="exec-chips">
        <button type="button" className={who === "all" ? "on" : ""} onClick={() => setWho("all")}>
          Everyone <span>{reports.length}</span>
        </button>
        {people.map(([id, name]) => (
          <button key={id} type="button" className={who === id ? "on" : ""} onClick={() => setWho(id)}>
            {name.split(" ")[0]} <span>{reports.filter((r) => r.user_id === id).length}</span>
          </button>
        ))}
        <button type="button" className={`is-warn${onlyBlocked ? " on" : ""}`} onClick={() => setOnlyBlocked(!onlyBlocked)}>
          Blockers only
        </button>
      </div>

      <div className="exec-feed">
        {shown.length === 0 && <p className="empty">Nothing matches.</p>}
        {shown.map((r) => (
          <article key={r.id} className="exec-feed__item">
            <header>
              <strong>{r.name}</strong>
              <span>
                {dayLabel(r.work_date)}
                {r.signed_in_at && ` · ${clock(r.signed_in_at)}`}
                {r.signed_out_at && `–${clock(r.signed_out_at)}`}
                {r.mood && MOOD[r.mood] && ` · ${MOOD[r.mood]}`}
              </span>
            </header>
            <p>{r.summary}</p>
            {r.blockers && (
              <p className="is-bad">
                <b>Blocked:</b> {r.blockers}
                {r.blocker_owner_name && (
                  <em className={r.blocker_resolved_at ? "is-cleared" : ""}>
                    {r.blocker_resolved_at ? `✓ cleared by ${r.blocker_owner_name}` : `→ waiting on ${r.blocker_owner_name}`}
                  </em>
                )}
              </p>
            )}
            {r.plan_tomorrow && (
              <p className="is-next">
                <b>Next:</b> {r.plan_tomorrow}
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

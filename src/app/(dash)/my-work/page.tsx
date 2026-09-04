import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPipeline, listLeads } from "@/lib/queries";
import { isAdminRole, daysQuiet } from "@/lib/types";
import StatusPill from "../pill";
import type { LeadRow } from "@/lib/types";

/**
 * One screen that answers "what do I do next".
 *
 * The dashboard reports on the business and the leads list is a filing
 * cabinet; neither tells a salesperson where to start their morning. This is
 * ordered by what is most at risk of being lost, not by what is newest.
 */
export default async function MyWork() {
  const me = await requireUser();
  const scope = isAdminRole(me.role) ? null : me.id;

  const [overdue, scheduled, unworked, pipeline] = await Promise.all([
    listLeads({ status: "overdue", ownerId: scope, sort: "next", perPage: 25 }).catch(() => null),
    listLeads({ status: "scheduled", ownerId: scope, sort: "next", perPage: 60 }).catch(() => null),
    // Brand new and nobody has done anything with them yet.
    listLeads({ status: "new", ownerId: scope, perPage: 25 }).catch(() => null),
    getPipeline(),
  ]);

  const now = scheduled?.now ?? overdue?.now ?? "";

  // Due today, from the scheduled set, excluding anything already overdue.
  const today = (() => {
    if (!scheduled) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    return scheduled.rows.filter((l) => {
      if (!l.next_action_at) return false;
      const d = new Date(l.next_action_at.replace(" ", "T"));
      return d >= start && d < end && d >= new Date();
    });
  })();

  const section = (
    title: string,
    blurb: string,
    rows: LeadRow[],
    tone: "overdue" | "today" | "new"
  ) => (
    <section className={`agenda-group g-${tone === "overdue" ? "overdue" : tone === "today" ? "today" : "week"}`}>
      <header className="agenda-group__head">
        <h2>{title}</h2>
        <b>{rows.length}</b>
        <p>{blurb}</p>
      </header>
      {rows.length === 0 ? (
        <p className="empty" style={{ padding: "14px 0" }}>
          Nothing here — good.
        </p>
      ) : (
        <ul className="agenda-list">
          {rows.map((l) => (
            <li key={l.id}>
              <span className="agenda-when">
                {l.next_action_at ? fmtDue(l.next_action_at) : `${daysQuiet(l.created_at, now) ?? 0}d old`}
              </span>
              <Link href={`/leads/${l.id}`} className="agenda-name">
                {l.name || "(no name)"}
              </Link>
              <StatusPill status={l.status} pipeline={pipeline} />
              <span className="agenda-meta">
                {l.email || l.phone || "no contact"}
                {isAdminRole(me.role) && ` · ${l.owner ?? "Unassigned"}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const total = (overdue?.rows.length ?? 0) + today.length + (unworked?.rows.length ?? 0);

  return (
    <>
      <div className="head">
        <h1>My work</h1>
        <div className="spacer" />
        <span className="board-legend">
          <b>{total}</b> waiting on you
        </span>
        <Link href="/agenda" className="btn ghost">
          Full agenda
        </Link>
      </div>

      <p className="board-hint">
        Ordered by what is most at risk, not by what arrived last. A lead leaves
        the overdue list as soon as you add a note or book a new date.
      </p>

      <div className="agenda">
        {section(
          "Overdue",
          "Past their follow-up date with nothing done since",
          overdue?.rows ?? [],
          "overdue"
        )}
        {section("Due today", "Booked for today and still to do", today, "today")}
        {section(
          "New, untouched",
          "Arrived recently and nobody has worked them yet",
          unworked?.rows ?? [],
          "new"
        )}
      </div>
    </>
  );
}

function fmtDue(raw: string) {
  const d = new Date(raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

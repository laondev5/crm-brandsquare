import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listLeads } from "@/lib/queries";
import type { LeadRow } from "@/lib/types";
import StatusPill from "../pill";

/** Follow-ups are read soonest-first, so one generous page covers the view. */
const LIMIT = 100;

type BucketKey = "overdue" | "today" | "tomorrow" | "week" | "later";

const BUCKETS: { key: BucketKey; label: string; blurb: string }[] = [
  { key: "overdue", label: "Overdue", blurb: "Past their follow-up date and still open" },
  { key: "today", label: "Today", blurb: "Due before the day is out" },
  { key: "tomorrow", label: "Tomorrow", blurb: "Worth preparing for tonight" },
  { key: "week", label: "This week", blurb: "Due within the next seven days" },
  { key: "later", label: "Later", blurb: "Booked further out" },
];

export default async function AgendaPage() {
  const me = await requireUser();
  const scope = me.role === "admin" ? null : me.id;

  let rows: LeadRow[] = [];
  let failed = false;

  try {
    // "scheduled" is every open lead with a follow-up booked — overdue and
    // upcoming alike, which is exactly the agenda's population.
    const res = await listLeads({
      status: "scheduled",
      sort: "next",
      ownerId: scope,
      perPage: LIMIT,
      page: 1,
    });
    rows = res.rows;
  } catch {
    failed = true;
  }

  const groups = groupByDue(rows);
  const overdueCount = groups.overdue.length;

  // Counted from the rows actually placed in a bucket, not from the server's
  // total. An older plugin does not recognise status=scheduled and returns
  // every open lead instead, which would otherwise print "98 follow-ups
  // booked" above a list showing one.
  const booked = BUCKETS.reduce((n, b) => n + groups[b.key].length, 0);
  const capped = rows.length >= LIMIT;

  return (
    <>
      <div className="head">
        <h1>Agenda</h1>
        <div className="spacer" />
        {!failed && (
          <span className="board-legend">
            <b>{booked}</b> follow-up{booked === 1 ? "" : "s"} booked
            {overdueCount > 0 && (
              <>
                {" · "}
                <b className="is-rot">{overdueCount}</b> overdue
              </>
            )}
          </span>
        )}
      </div>

      <p className="board-hint">
        Every lead with a follow-up date, soonest first. Set a date on a lead and it appears here.
      </p>

      {failed ? (
        <div className="msg err">Could not load your agenda. Reload to try again.</div>
      ) : booked === 0 ? (
        <div className="card">
          <p className="empty">
            Nothing booked. Open a lead and set <strong>Next action due</strong> to schedule a follow-up.
          </p>
        </div>
      ) : (
        <div className="agenda">
          {BUCKETS.map((b) => {
            const list = groups[b.key];
            if (list.length === 0) return null;
            return (
              <section key={b.key} className={`agenda-group${b.key === "overdue" ? " is-overdue" : ""}`}>
                <header className="agenda-group__head">
                  <h2>{b.label}</h2>
                  <b>{list.length}</b>
                  <p>{b.blurb}</p>
                </header>
                <ul className="agenda-list">
                  {list.map((l) => (
                    <li key={l.id}>
                      <span className="agenda-when">{fmtDue(l.next_action_at!, b.key)}</span>
                      <Link href={`/leads/${l.id}`} className="agenda-name">
                        {l.name || "(no name)"}
                      </Link>
                      <StatusPill status={l.status} />
                      <span className="agenda-meta">
                        {l.form_name ?? "—"} · {l.owner ?? "Unassigned"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {capped && (
            <p className="agenda-more">
              Showing the {booked} soonest.{" "}
              <Link href="/leads?status=overdue">See overdue in Leads</Link>
            </p>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Buckets by calendar day rather than elapsed hours, so "tomorrow" means the
 * next date on the wall calendar and not "in 24 hours". Dates arrive as the
 * site's local time, matching how the rest of the dashboard reads them.
 */
function groupByDue(rows: LeadRow[]): Record<BucketKey, LeadRow[]> {
  const out: Record<BucketKey, LeadRow[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    week: [],
    later: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86_400_000;

  for (const l of rows) {
    if (!l.next_action_at) continue;
    const due = new Date(l.next_action_at.replace(" ", "T"));
    if (isNaN(due.getTime())) continue;

    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const dayDiff = Math.round((dueDay - startOfToday) / DAY);

    if (due.getTime() < now.getTime()) out.overdue.push(l);
    else if (dayDiff === 0) out.today.push(l);
    else if (dayDiff === 1) out.tomorrow.push(l);
    else if (dayDiff <= 7) out.week.push(l);
    else out.later.push(l);
  }

  return out;
}

function fmtDue(raw: string, bucket: BucketKey) {
  const d = new Date(raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return raw;
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  // Inside Today/Tomorrow the date is already implied by the heading.
  if (bucket === "today" || bucket === "tomorrow") return time;
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${time}`;
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listWorkdays, workOverview } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/types";

function clock(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function minutesBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const x = new Date(a.replace(" ", "T")).getTime();
  const y = new Date(b.replace(" ", "T")).getTime();
  return isNaN(x) || isNaN(y) ? null : Math.max(0, Math.round((y - x) / 60000));
}

function hours(min: number) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

function shift(day: string, n: number) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(day: string) {
  return new Date(day + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function lastSeen(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function since(iso: string | null) {
  if (!iso) return null;
  const t = new Date(iso.replace(" ", "T")).getTime();
  if (isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days < 1) return "today";
  return days === 1 ? "since yesterday" : `for ${days} days`;
}

/**
 * The manager's screen.
 *
 * Ordered by what needs a decision, not by what is tidy: what is stuck, then
 * what is late, then who is working and what they reported. A dashboard that
 * opens on a headcount makes you hunt for the problems.
 */
export default async function TeamWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const me = await requireAdmin();
  const sp = await searchParams;

  const [overview, days] = await Promise.all([
    workOverview(me, sp.date).catch(() => null),
    listWorkdays(me, sp.date).catch(() => ({ date: "", days: [], manager: true })),
  ]);

  if (!overview) {
    return (
      <>
        <div className="head">
          <h1>Team</h1>
        </div>
        <div className="msg err">
          Could not load the team overview. If the plugin was updated recently, open wp-admin once
          so the new tables are created.
        </div>
      </>
    );
  }

  const day = overview.date;
  const today = overview.today ?? overview.date;
  const isToday = day === today;
  const working = overview.team.filter((t) => t.signed_in_at && !t.signed_out_at).length;
  const reported = overview.team.filter((t) => t.reported).length;
  const notStarted = overview.team.filter((t) => !t.signed_in_at).length;

  return (
    <>
      <div className="head">
        <h1>Team</h1>
        <div className="spacer" />
        <Link href="/work" className="btn ghost">
          My day
        </Link>
        <Link href="/projects" className="btn ghost">
          Projects
        </Link>
      </div>

      <div className="stats">
        <div className="stat t-open">
          <span>{isToday ? "Working now" : "Signed in"}</span>
          <b>{isToday ? working : overview.team.filter((t) => t.signed_in_at).length}</b>
        </div>
        <div className={overview.blocked.length > 0 ? "stat t-overdue" : "stat t-total"}>
          <span>Blocked</span>
          <b>{overview.blocked.length}</b>
        </div>
        <div className={overview.overdue.length > 0 ? "stat t-quiet" : "stat t-total"}>
          <span>Overdue</span>
          <b>{overview.overdue.length}</b>
        </div>
        <div className="stat t-won">
          <span>{isToday ? "Reported today" : "Reported"}</span>
          <b>
            {reported}/{overview.team.length}
          </b>
        </div>
      </div>

      {/* Stuck work first. It is the only thing on this page that needs a
          manager to actually do something today. */}
      {overview.blocked.length > 0 && (
        <>
          <h2>Stuck, and why</h2>
          <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
            <table className="tbl" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ width: 230 }}>Task</th>
                  <th style={{ width: 150 }}>Who</th>
                  <th>What they need</th>
                  <th style={{ width: 120 }}>Stuck</th>
                </tr>
              </thead>
              <tbody>
                {overview.blocked.map((t) => (
                  <tr key={t.id}>
                    <td data-l="Task">
                      <strong style={{ color: "var(--ink)" }}>{t.title}</strong>
                      {t.project && (
                        <>
                          <br />
                          <small style={{ color: "var(--muted)" }}>{t.project}</small>
                        </>
                      )}
                    </td>
                    <td data-l="Who">{t.assignee ?? "Unassigned"}</td>
                    <td data-l="Needs" style={{ whiteSpace: "pre-wrap", color: "var(--err)" }}>
                      {t.blocker || "No reason given"}
                    </td>
                    <td data-l="Stuck">{since(t.blocked_at) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {overview.overdue.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>Past its due date</h2>
          <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
            <table className="tbl" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th style={{ width: 150 }}>Who</th>
                  <th style={{ width: 120 }}>Due</th>
                  <th style={{ width: 120 }}>Stage</th>
                </tr>
              </thead>
              <tbody>
                {overview.overdue.map((t) => (
                  <tr key={t.id}>
                    <td data-l="Task">{t.title}</td>
                    <td data-l="Who">{t.assignee ?? "Unassigned"}</td>
                    <td data-l="Due" style={{ color: "var(--err)" }}>
                      {t.due_date}
                      {t.due_time ? ` ${t.due_time}` : ""}
                    </td>
                    <td data-l="Stage">{t.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="row" style={{ alignItems: "center", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{isToday ? "Today" : dayLabel(day)}</h2>
        <div className="spacer" />
        <Link href={`/work/team?date=${shift(day, -1)}`} className="btn ghost sm">
          ← Previous day
        </Link>
        {!isToday && (
          <Link href={`/work/team?date=${shift(day, 1)}`} className="btn ghost sm">
            Next day →
          </Link>
        )}
        <form action="/work/team" className="row" style={{ gap: 6 }}>
          <input type="date" name="date" defaultValue={day} max={today} style={{ width: 150 }} />
          <button className="btn ghost sm">Go</button>
        </form>
        {!isToday && (
          <Link href="/work/team" className="btn sm">
            Today
          </Link>
        )}
      </div>
      <p className="board-hint">
        When each person opened the CRM, signed in and out for the day, how much they did on leads,
        and the report they wrote. Click a name for their full history.
        {notStarted > 0 && isToday && ` ${notStarted} have not signed in yet.`}
      </p>

      <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 1080 }}>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Person</th>
              <th style={{ width: 120 }}>Opened CRM</th>
              <th style={{ width: 130 }}>Signed in / out</th>
              <th style={{ width: 110 }}>Activity</th>
              <th>Daily report</th>
              <th style={{ width: 200 }}>Blocked by</th>
            </tr>
          </thead>
          <tbody>
            {overview.team.map((t) => {
              const inAt = clock(t.signed_in_at);
              const outAt = clock(t.signed_out_at);
              const first = clock(t.first_login_at ?? null);
              const day2 = days.days.find((d) => d.user_id === t.user_id);
              const summary = t.summary || day2?.summary || "";
              const plan = t.plan_tomorrow || day2?.plan_tomorrow || "";
              const worked = minutesBetween(t.signed_in_at, t.signed_out_at);
              return (
                <tr key={t.user_id}>
                  <td data-l="Person">
                    <Link href={`/work/team/${t.user_id}`} style={{ color: "var(--ink)", fontWeight: 600 }}>
                      {t.name}
                    </Link>
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      {t.role ? ROLE_LABEL[t.role] : ""}
                      {t.last_login_at ? ` · last in ${lastSeen(t.last_login_at)}` : ""}
                    </small>
                  </td>

                  <td data-l="Opened CRM">
                    {first ? (
                      <span style={{ fontSize: 12.5 }}>
                        {first}
                        {(t.logins ?? 0) > 1 && <small style={{ color: "var(--muted)" }}> · {t.logins}×</small>}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12.5 }}>—</span>
                    )}
                  </td>

                  <td data-l="Signed in / out">
                    {!inAt ? (
                      <span className="pill">Not in</span>
                    ) : outAt ? (
                      <span style={{ fontSize: 12.5 }}>
                        {inAt} – {outAt}
                        {worked !== null && <small style={{ display: "block", color: "var(--muted)" }}>{hours(worked)}</small>}
                      </span>
                    ) : isToday ? (
                      <span className="pill s-active">In since {inAt}</span>
                    ) : (
                      <span style={{ fontSize: 12.5 }}>{inAt} – no sign-out</span>
                    )}
                  </td>

                  <td data-l="Activity" style={{ fontSize: 12.5 }}>
                    <b>{t.lead_actions ?? 0}</b> on leads
                    <br />
                    <b>{t.open_tasks}</b> open tasks
                    {t.blocked_tasks > 0 && (
                      <>
                        {" · "}
                        <b style={{ color: "var(--err)" }}>{t.blocked_tasks}</b> stuck
                      </>
                    )}
                  </td>

                  <td data-l="Report" style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                    {summary ? (
                      <>
                        {summary}
                        {plan && (
                          <small style={{ display: "block", color: "var(--muted)", marginTop: 4 }}>
                            <b>Next:</b> {plan}
                          </small>
                        )}
                      </>
                    ) : inAt && !outAt && isToday ? (
                      <span style={{ color: "var(--muted)" }}>Still working</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>No report</span>
                    )}
                  </td>

                  <td data-l="Blocked" style={{ whiteSpace: "pre-wrap", color: "var(--err)", fontSize: 13 }}>
                    {day2?.blockers || t.blockers || ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

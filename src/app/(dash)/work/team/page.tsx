import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listWorkdays, workOverview } from "@/lib/queries";

function clock(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
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
    workOverview(me).catch(() => null),
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
          <span>Working now</span>
          <b>{working}</b>
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
          <span>Reported today</span>
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
                    </td>
                    <td data-l="Stage">{t.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ marginTop: 24 }}>Today</h2>
      <p className="board-hint">
        Who is working, what they carry, and what they wrote down when they signed out.
        {notStarted > 0 && ` ${notStarted} have not signed in yet.`}
      </p>

      <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Person</th>
              <th style={{ width: 120 }}>In / out</th>
              <th style={{ width: 130 }}>Workload</th>
              <th>What they got done</th>
              <th style={{ width: 220 }}>Blocked by</th>
            </tr>
          </thead>
          <tbody>
            {overview.team.map((t) => {
              const inAt = clock(t.signed_in_at);
              const outAt = clock(t.signed_out_at);
              const day = days.days.find((d) => d.user_id === t.user_id);
              return (
                <tr key={t.user_id}>
                  <td data-l="Person" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {t.name}
                  </td>

                  <td data-l="In / out">
                    {!inAt ? (
                      <span className="pill">Not in</span>
                    ) : outAt ? (
                      <span style={{ fontSize: 12.5 }}>
                        {inAt} – {outAt}
                      </span>
                    ) : (
                      <span className="pill s-active">In since {inAt}</span>
                    )}
                  </td>

                  <td data-l="Workload">
                    <b>{t.open_tasks}</b> open
                    {t.blocked_tasks > 0 && (
                      <>
                        {" · "}
                        <b style={{ color: "var(--err)" }}>{t.blocked_tasks}</b> stuck
                      </>
                    )}
                  </td>

                  <td data-l="Done" style={{ whiteSpace: "pre-wrap" }}>
                    {day?.summary ? (
                      day.summary
                    ) : inAt && !outAt ? (
                      <span style={{ color: "var(--muted)" }}>Still working</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>No report</span>
                    )}
                  </td>

                  <td data-l="Blocked" style={{ whiteSpace: "pre-wrap", color: "var(--err)" }}>
                    {day?.blockers ?? t.blockers ?? ""}
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

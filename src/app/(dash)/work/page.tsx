import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allSubadmins, getToday, listProjects, listWorkTasks, workdayHistory } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import DayCard from "./day-card";
import Board from "./board";

function shortDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function clock(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * My day: sign in, work the board, sign out with a report.
 *
 * Everything one person needs in a day on one screen, in the order the day
 * happens — start, the work itself, then the write-up. A separate page per
 * step would mean nobody ever reaches the last one.
 */
export default async function WorkPage() {
  const me = await requireUser();
  const manager = isAdminRole(me.role);

  const [today, mine, projects, history, people] = await Promise.all([
    getToday(me).catch(() => ({ day: "", workday: null, now: "" })),
    listWorkTasks(me, { assigned: "me" }).catch(() => ({ tasks: [], stages: [] })),
    listProjects(me)
      .then((r) => r.projects)
      .catch(() => []),
    workdayHistory(me, undefined, 7)
      .then((r) => r.history)
      .catch(() => []),
    manager ? allSubadmins().catch(() => []) : Promise.resolve([]),
  ]);

  const open = mine.tasks.filter((t) => t.stage !== "done").length;
  const blocked = mine.tasks.filter((t) => t.stage === "blocked").length;

  return (
    <>
      <div className="head">
        <h1>My day</h1>
        <div className="spacer" />
        <span className="board-legend">
          <b>{open}</b> open
          {blocked > 0 && (
            <>
              {" · "}
              <b className="is-rot">{blocked}</b> blocked
            </>
          )}
        </span>
        {manager && (
          <Link href="/work/team" className="btn ghost">
            Team overview
          </Link>
        )}
        <Link href="/projects" className="btn ghost">
          Projects
        </Link>
      </div>

      <DayCard workday={today.workday} serverNow={today.now} />

      <h2 style={{ marginTop: 24 }}>Your work</h2>
      <p className="board-hint">
        Move a card as things change. Marking something blocked asks what is in the way, and that
        reason is what your manager sees — so it gets unblocked without a meeting.
      </p>

      <Board
        tasks={mine.tasks}
        stages={mine.stages}
        projects={projects}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
        canAssign={manager}
      />

      {history.length > 0 && (
        <>
          <h2 style={{ marginTop: 28 }}>Your last few days</h2>
          <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
            <table className="tbl" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Day</th>
                  <th style={{ width: 80 }}>In</th>
                  <th style={{ width: 80 }}>Out</th>
                  <th>What you got done</th>
                  <th style={{ width: 220 }}>Blocked by</th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => (
                  <tr key={d.work_date}>
                    <td data-l="Day">{shortDate(d.work_date)}</td>
                    <td data-l="In">{clock(d.signed_in_at)}</td>
                    <td data-l="Out">{clock(d.signed_out_at)}</td>
                    <td data-l="Done" style={{ whiteSpace: "pre-wrap" }}>
                      {d.summary || <span style={{ color: "var(--muted)" }}>No report</span>}
                    </td>
                    <td data-l="Blocked" style={{ whiteSpace: "pre-wrap", color: "var(--err)" }}>
                      {d.blockers || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  allSubadmins,
  getToday,
  listLeads,
  listProjects,
  listWorkTasks,
  workdayHistory,
} from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import StatusPill from "../pill";
import DayCard from "./day-card";
import Board from "./board";
import FollowUps from "./follow-ups";
import Reports from "./reports";

const TABS = [
  { key: "today", label: "Today" },
  { key: "tasks", label: "My tasks" },
  { key: "followups", label: "Follow-ups" },
  { key: "reports", label: "Reports" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * One page for one person's work.
 *
 * My work, Agenda and My day were three destinations answering the same
 * question — what should I be doing — from three angles, so nobody knew which
 * to open and all three had to be checked. They are tabs now: the day at the
 * top, the work under it, and the same lead follow-ups that used to live on
 * their own page.
 */
export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const me = await requireUser();
  const manager = isAdminRole(me.role);
  const scope = manager ? null : me.id;

  const sp = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key ?? "today") as TabKey;
  const reportView = sp.view === "weekly" ? "weekly" : "daily";

  const [today, mine, projects, history, people, dueToday] = await Promise.all([
    getToday(me).catch(() => ({ day: "", workday: null, now: "" })),
    listWorkTasks(me, { assigned: "me" }).catch(() => ({ tasks: [], stages: [] })),
    listProjects(me)
      .then((r) => r.projects)
      .catch(() => []),
    workdayHistory(me, undefined, 30)
      .then((r) => r.history)
      .catch(() => []),
    manager ? allSubadmins().catch(() => []) : Promise.resolve([]),
    // Only what is actually late, for the nudge on the Today tab.
    listLeads({ status: "overdue", ownerId: scope, sort: "next", perPage: 10 })
      .then((r) => r.rows)
      .catch(() => []),
  ]);

  const open = mine.tasks.filter((t) => t.stage !== "done").length;
  const blocked = mine.tasks.filter((t) => t.stage === "blocked");

  const href = (t: TabKey, view?: string) =>
    `/work?tab=${t}${view ? `&view=${view}` : ""}`;

  return (
    <>
      <div className="head">
        <h1>My work</h1>
        <div className="spacer" />
        <span className="board-legend">
          <b>{open}</b> open
          {blocked.length > 0 && (
            <>
              {" · "}
              <b className="is-rot">{blocked.length}</b> blocked
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

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={href(t.key)} className={tab === t.key ? "on" : ""}>
            {t.label}
            {t.key === "followups" && dueToday.length > 0 && (
              <span style={{ opacity: 0.7 }}> {dueToday.length}</span>
            )}
          </Link>
        ))}
      </div>

      {tab === "today" && (
        <>
          <DayCard workday={today.workday} serverNow={today.now} />

          {/* The two things that would otherwise bite you today, surfaced
              here rather than left on a tab you might not open. */}
          {blocked.length > 0 && (
            <div className="msg warn">
              <strong>{blocked.length}</strong> of your tasks{" "}
              {blocked.length === 1 ? "is" : "are"} blocked:{" "}
              {blocked.map((t) => t.title).join(", ")}.{" "}
              <Link href={href("tasks")}>Open your tasks</Link>
            </div>
          )}

          {dueToday.length > 0 && (
            <div className="card">
              <h2>Follow-ups that are late</h2>
              <table className="tbl">
                <tbody>
                  {dueToday.map((l) => (
                    <tr key={l.id}>
                      <td data-l="Lead">
                        <Link href={`/leads/${l.id}`} className="name">
                          {l.name || "(no name)"}
                        </Link>
                      </td>
                      <td data-l="Stage" style={{ width: 150 }}>
                        <StatusPill status={l.status} />
                      </td>
                      <td data-l="Due" style={{ width: 160, color: "var(--err)" }}>
                        {l.next_action_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: "10px 0 0" }}>
                <Link href={href("followups")}>See everything booked</Link>
              </p>
            </div>
          )}
        </>
      )}

      {tab === "tasks" && (
        <>
          <p className="board-hint">
            Move a card as things change. Marking something blocked asks what is in the way, and
            that reason is what your manager sees — so it gets unblocked without a meeting.
          </p>
          <Board
            tasks={mine.tasks}
            stages={mine.stages}
            projects={projects}
            people={people.map((p) => ({ id: p.id, name: p.name }))}
            canAssign={manager}
          />
        </>
      )}

      {tab === "followups" && (
        <>
          <p className="board-hint">
            Every lead with a follow-up date, soonest first. Set a date on a lead and it appears
            here.
          </p>
          <FollowUps scope={scope} />
        </>
      )}

      {tab === "reports" && (
        <>
          <div className="tabs" style={{ marginBottom: 12 }}>
            <Link href={href("reports")} className={reportView === "daily" ? "on" : ""}>
              Day by day
            </Link>
            <Link href={href("reports", "weekly")} className={reportView === "weekly" ? "on" : ""}>
              By week
            </Link>
          </div>
          <p className="board-hint">
            {reportView === "weekly"
              ? "Your days rolled up by week — built from what you wrote each evening, so there is nothing extra to fill in."
              : "What you wrote when you signed out each day."}
          </p>
          <Reports history={history} view={reportView} />
        </>
      )}
    </>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allSubadmins, listProjects, listWorkTasks } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import Board from "../work/board";
import ProjectBar from "./project-bar";

/**
 * Projects, and the board for whichever one is open.
 *
 * Opening on "everything" rather than on a project list is deliberate: most
 * days the question is "what is the team doing", not "what is in project 4",
 * and a list of folders you have to click through to see any work is a filing
 * cabinet rather than a board.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const me = await requireUser();
  const manager = isAdminRole(me.role);

  const sp = await searchParams;
  const projectId = Number(sp.project) || null;

  const [{ projects }, board, people] = await Promise.all([
    listProjects(me).catch(() => ({ projects: [], stages: [] })),
    listWorkTasks(me, projectId ? { project: projectId } : {}).catch(() => ({
      tasks: [],
      stages: [],
    })),
    manager ? allSubadmins().catch(() => []) : Promise.resolve([]),
  ]);

  const active = projects.find((p) => p.id === projectId) ?? null;

  return (
    <>
      <div className="head">
        <h1>{active ? active.name : "Projects"}</h1>
        <div className="spacer" />
        {active && (
          <span className="board-legend">
            <b>{active.progress}%</b> done · {active.done}/{active.total}
          </span>
        )}
        <Link href="/work" className="btn ghost">
          My day
        </Link>
        {manager && (
          <Link href="/work/team" className="btn ghost">
            Team
          </Link>
        )}
      </div>

      <ProjectBar
        projects={projects}
        activeId={projectId}
        canManage={manager}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
      />

      {active?.detail && <p className="board-hint">{active.detail}</p>}

      <Board
        tasks={board.tasks}
        stages={board.stages}
        projects={projects}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
        canAssign={manager}
        projectId={projectId}
      />
    </>
  );
}

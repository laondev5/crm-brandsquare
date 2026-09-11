"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTaskAction, saveTaskAction } from "@/app/actions/work";
import type { Project, WorkStage, WorkTask } from "@/lib/types";

function dueLabel(d: string | null) {
  if (!d) return null;
  const due = new Date(d + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, late: true };
  if (days === 0) return { text: "Due today", late: false };
  if (days === 1) return { text: "Due tomorrow", late: false };
  return { text: `Due in ${days}d`, late: false };
}

/**
 * The board.
 *
 * Cards move with a dropdown rather than by dragging. Dragging is nicer on a
 * desktop and unusable on the phone half the team actually works from, and it
 * cannot be reached by keyboard at all — so the move is a control that works
 * everywhere, and the column is still the thing you read.
 *
 * Moving to Blocked asks why, on the spot. A blocked column full of cards
 * whose reason nobody wrote down is the failure this is built to avoid.
 */
export default function Board({
  tasks,
  stages,
  projects,
  people,
  canAssign,
  projectId,
}: {
  tasks: WorkTask[];
  stages: WorkStage[];
  projects: Project[];
  people: { id: number; name: string }[];
  /** Managers can assign work; everyone else moves their own. */
  canAssign: boolean;
  /** When the board is showing one project, new cards land in it. */
  projectId?: number | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [blocking, setBlocking] = useState<WorkTask | null>(null);
  const [blockText, setBlockText] = useState("");

  const run = (fn: () => Promise<{ ok: true } | { error: string }>) => {
    setErr("");
    start(async () => {
      const res = await fn();
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setBlocking(null);
      setBlockText("");
      setAdding(false);
      router.refresh();
    });
  };

  const move = (task: WorkTask, stage: string) => {
    if (stage === "blocked") {
      setBlocking(task);
      setBlockText(task.blocker ?? "");
      return;
    }
    run(() => saveTaskAction(task.id, { stage }));
  };

  return (
    <>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      {/* Why it is stuck, asked at the moment it becomes stuck. */}
      {blocking && (
        <div className="card" style={{ borderColor: "var(--err)" }}>
          <h2 style={{ margin: "0 0 8px" }}>What is blocking &ldquo;{blocking.title}&rdquo;?</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
            This is what the manager sees on the team screen, so say what you need and from whom.
          </p>
          <textarea
            rows={3}
            value={blockText}
            autoFocus
            onChange={(e) => setBlockText(e.target.value)}
            placeholder="Waiting on the customs agent to confirm duty rates before I can finish the quote."
            style={{ width: "100%" }}
          />
          <div className="row" style={{ gap: 10, marginTop: 10 }}>
            <button
              className="btn"
              disabled={busy || !blockText.trim()}
              onClick={() =>
                run(() => saveTaskAction(blocking.id, { stage: "blocked", blocker: blockText.trim() }))
              }
            >
              {busy ? "Saving…" : "Mark blocked"}
            </button>
            <button className="btn ghost" disabled={busy} onClick={() => setBlocking(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="board">
        {stages.map((s) => {
          const inColumn = tasks.filter((t) => t.stage === s.key);
          return (
            <div className="board-col" key={s.key}>
              <div
                className="board-col__head is-stage"
                style={{ ["--stage" as string]: s.colour }}
              >
                <span className="board-dot is-stage" aria-hidden="true" />
                <h2>{s.label}</h2>
                <b>{inColumn.length}</b>
              </div>

              <div className="board-col__body">
                {inColumn.length === 0 && <p className="board-msg">Nothing here.</p>}

                {inColumn.map((t) => {
                  const due = dueLabel(t.due_date);
                  return (
                    <div
                      className={`board-card${due?.late ? " is-stale" : ""}`}
                      key={t.id}
                      style={{ cursor: "default", borderLeft: `3px solid ${t.colour || s.colour}` }}
                    >
                      <span className="board-card__name">{t.title}</span>

                      {t.detail && <p className="board-card__contact">{t.detail}</p>}

                      {t.stage === "blocked" && t.blocker && (
                        <p className="board-card__rot" style={{ color: "var(--err)" }}>
                          {t.blocker}
                        </p>
                      )}

                      <div className="board-card__meta">
                        {t.project && <span className="board-tag">{t.project}</span>}
                        {t.priority === "high" && <span className="board-tag">High</span>}
                        {t.assignee && <span>{t.assignee}</span>}
                        {due && (
                          <span
                            className="board-card__date"
                            style={due.late ? { color: "var(--err)", fontWeight: 600 } : undefined}
                          >
                            {due.text}
                          </span>
                        )}
                      </div>

                      <div className="board-card__move row" style={{ gap: 6 }}>
                        <select
                          value={t.stage}
                          disabled={busy}
                          aria-label={`Move ${t.title}`}
                          onChange={(e) => move(t, e.target.value)}
                        >
                          {stages.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                        </select>

                        {canAssign && (
                          <select
                            value={t.assigned_to ?? ""}
                            disabled={busy}
                            aria-label={`Assign ${t.title}`}
                            onChange={(e) =>
                              run(() =>
                                saveTaskAction(t.id, { assigned_to: Number(e.target.value) || 0 })
                              )
                            }
                          >
                            <option value="">Unassigned</option>
                            {people.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          className="btn danger sm"
                          disabled={busy}
                          aria-label={`Remove ${t.title}`}
                          onClick={() => {
                            if (confirm(`Remove "${t.title}"?`)) run(() => deleteTaskAction(t.id));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <form
          className="card"
          style={{ marginTop: 16, maxWidth: 620 }}
          action={(form) =>
            run(() =>
              saveTaskAction(null, {
                title: String(form.get("title") ?? ""),
                detail: String(form.get("detail") ?? ""),
                project_id: Number(form.get("project_id")) || projectId || 0,
                assigned_to: Number(form.get("assigned_to")) || 0,
                priority: String(form.get("priority") ?? "normal"),
                due_date: String(form.get("due_date") ?? ""),
                stage: "todo",
              })
            )
          }
        >
          <h2>Add a task</h2>

          <label className="f">
            <span>What needs doing?</span>
            <input type="text" name="title" required placeholder="Draft the rice mill spec sheet" />
          </label>

          <label className="f">
            <span>Detail</span>
            <textarea name="detail" rows={2} placeholder="Anything the person picking this up needs." />
          </label>

          <div className="grid2" style={{ gap: 12 }}>
            {!projectId && (
              <label className="f">
                <span>Project</span>
                <select name="project_id" defaultValue="">
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="f">
              <span>Who is doing it?</span>
              <select name="assigned_to" defaultValue="">
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="f">
              <span>Priority</span>
              <select name="priority" defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="f">
              <span>Due</span>
              <input type="date" name="due_date" />
            </label>
          </div>

          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <button className="btn" disabled={busy}>
              {busy ? "Adding…" : "Add task"}
            </button>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="btn" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>
          + Add a task
        </button>
      )}
    </>
  );
}

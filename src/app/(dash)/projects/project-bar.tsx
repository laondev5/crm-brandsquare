"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProjectAction, saveProjectAction } from "@/app/actions/work";
import type { Project } from "@/lib/types";

const COLOURS = ["#64748b", "#1665c1", "#7c3aed", "#0e7490", "#b45309", "#3a7a12", "#a83232"];

/**
 * The project picker, and the form for adding one.
 *
 * Each project shows its own progress in the tab rather than only inside it,
 * so a manager can see which one is moving without opening any of them.
 */
export default function ProjectBar({
  projects,
  activeId,
  canManage,
  people,
}: {
  projects: Project[];
  activeId: number | null;
  canManage: boolean;
  people: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const [colour, setColour] = useState(COLOURS[0]);

  const open = adding || editing;

  const run = (fn: () => Promise<{ ok: true; id?: number } | { error: string }>) => {
    setErr("");
    start(async () => {
      const res = await fn();
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setAdding(false);
      setEditing(null);
      router.refresh();
    });
  };

  return (
    <>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      <div className="tabs" style={{ flexWrap: "wrap" }}>
        <Link href="/projects" className={activeId === null ? "on" : ""}>
          Everything
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects?project=${p.id}`}
            className={activeId === p.id ? "on" : ""}
            style={{ borderBottomColor: activeId === p.id ? p.colour : undefined }}
          >
            {p.name}{" "}
            <span style={{ opacity: 0.6 }}>
              {p.total > 0 ? `${p.progress}%` : "—"}
            </span>
          </Link>
        ))}
      </div>

      {canManage && !open && (
        <div className="row" style={{ gap: 10, marginBottom: 14 }}>
          <button className="btn ghost sm" onClick={() => setAdding(true)}>
            + New project
          </button>
          {activeId !== null && (
            <>
              <button
                className="btn ghost sm"
                onClick={() => setEditing(projects.find((p) => p.id === activeId) ?? null)}
              >
                Edit this project
              </button>
              <button
                className="btn danger sm"
                disabled={busy}
                onClick={() => {
                  const p = projects.find((x) => x.id === activeId);
                  if (!p) return;
                  const ok = confirm(
                    `Remove "${p.name}"? Its tasks are kept and simply stop belonging to a project, so nobody loses work they did.`
                  );
                  if (ok) run(() => deleteProjectAction(p.id));
                }}
              >
                Remove project
              </button>
            </>
          )}
        </div>
      )}

      {open && (
        <form
          className="card"
          style={{ maxWidth: 620, marginBottom: 16 }}
          action={(form) =>
            run(() =>
              saveProjectAction(editing?.id ?? null, {
                name: String(form.get("name") ?? ""),
                detail: String(form.get("detail") ?? ""),
                owner_id: Number(form.get("owner_id")) || 0,
                due_date: String(form.get("due_date") ?? ""),
                colour: String(form.get("colour") ?? colour),
              })
            )
          }
        >
          <h2>{editing ? `Edit ${editing.name}` : "New project"}</h2>

          <label className="f">
            <span>Name</span>
            <input
              type="text"
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              placeholder="Rice mill launch"
            />
          </label>

          <label className="f">
            <span>What is it?</span>
            <textarea
              name="detail"
              rows={2}
              defaultValue={editing?.detail ?? ""}
              placeholder="Everything needed to get the new rice mill line selling."
            />
          </label>

          <div className="grid2" style={{ gap: 12 }}>
            <label className="f">
              <span>Who is leading it?</span>
              <select name="owner_id" defaultValue={editing?.owner_id ?? ""}>
                <option value="">Nobody yet</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="f">
              <span>Target date</span>
              <input type="date" name="due_date" defaultValue={editing?.due_date ?? ""} />
            </label>
          </div>

          <div className="f">
            <span>Colour</span>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {COLOURS.map((c) => (
                <label key={c} style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="colour"
                    value={c}
                    defaultChecked={(editing?.colour ?? colour) === c}
                    onChange={() => setColour(c)}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      display: "block",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: c,
                      outline:
                        (editing?.colour ?? colour) === c ? "2px solid var(--ink)" : "none",
                      outlineOffset: 2,
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <button className="btn" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create project"}
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setEditing(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}

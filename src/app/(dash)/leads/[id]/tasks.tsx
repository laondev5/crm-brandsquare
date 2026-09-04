"use client";

import { useState, useTransition } from "react";
import { addTaskAction, deleteTaskAction, setTaskDoneAction } from "@/app/actions/tasks";
import type { Task } from "@/lib/types";

/**
 * Follow-ups on a lead.
 *
 * The lead's next-action date is kept in step with the earliest open task by
 * the plugin, so ticking one off here is what moves the lead on the agenda and
 * off the overdue list — the two are the same fact, not two things to keep in
 * sync by hand.
 */
export default function Tasks({ leadId, initial }: { leadId: number; initial: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState("");
  const [busy, startTransition] = useTransition();

  const run = (fn: () => Promise<{ tasks: Task[] } | { error: string }>) => {
    setErr("");
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) setErr(res.error);
      else setTasks(res.tasks);
    });
  };

  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at);

  return (
    <div className="card">
      <h2>Follow-ups</h2>

      {err && <div className="msg err">{err}</div>}

      <form
        className="row"
        style={{ marginBottom: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          run(async () => {
            const r = await addTaskAction(leadId, title, due);
            if (!("error" in r)) {
              setTitle("");
              setDue("");
            }
            return r;
          });
        }}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Call back about the deposit…"
          style={{ flex: 1, minWidth: 180 }}
          aria-label="What needs doing"
        />
        <input
          type="datetime-local"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          style={{ width: 210 }}
          aria-label="When it is due"
        />
        <button className="btn" disabled={busy || !title.trim()}>
          Add
        </button>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <p className="empty" style={{ padding: "18px 0" }}>
          Nothing scheduled. Adding one here sets the lead&rsquo;s next action date.
        </p>
      ) : (
        <ul className="tasklist">
          {[...open, ...done].map((t) => {
            const overdue = !t.done_at && t.due_at && new Date(t.due_at.replace(" ", "T")) < new Date();
            return (
              <li key={t.id} className={t.done_at ? "is-done" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!t.done_at}
                    disabled={busy}
                    onChange={(e) => run(() => setTaskDoneAction(leadId, t.id, e.target.checked))}
                  />
                  <span className="tasklist__title">{t.title}</span>
                </label>
                {t.due_at && (
                  <span className={`tasklist__due${overdue ? " is-over" : ""}`}>{fmt(t.due_at)}</span>
                )}
                <button
                  className="btn danger sm"
                  disabled={busy}
                  aria-label={`Remove ${t.title}`}
                  onClick={() => run(() => deleteTaskAction(leadId, t.id))}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

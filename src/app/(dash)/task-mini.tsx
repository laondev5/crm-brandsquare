"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeTaskAction, quickAddTaskAction } from "@/app/actions/tasks-global";
import type { DashUser, Task } from "@/lib/types";

/**
 * The tasks attached to one record. Adding one here also puts it on the
 * shared Tasks screen, which is the point: a follow-up on a deal belongs on
 * the same list as everything else assigned to that person.
 */
export default function TaskMini({
  tasks,
  people,
  meId,
  leadId = 0,
  orgId = 0,
  dealId = 0,
}: {
  tasks: Task[];
  people: DashUser[];
  meId: number;
  leadId?: number;
  orgId?: number;
  dealId?: number;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(quickAddTaskAction, null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState(String(meId));
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  useEffect(() => {
    if (!state?.ok) return;
    setTitle("");
    setDue("");
    router.refresh();
  }, [state, router]);

  const toggle = (id: number, done: boolean) => {
    setError("");
    start(async () => {
      const res = await completeTaskAction(id, done);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  };

  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at);

  return (
    <div className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>Tasks</h2>
        <div style={{ flex: 1 }} />
        <Link href={`/tasks?${dealId ? `deal_id=${dealId}` : orgId ? `org_id=${orgId}` : `lead_id=${leadId}`}`} style={{ fontSize: 12 }}>
          Open in Tasks
        </Link>
      </div>

      {(state?.error || error) && <div className="msg err">{state?.error || error}</div>}

      <form action={action} className="grid" style={{ gap: 8, margin: "12px 0 14px" }}>
        <input type="hidden" name="lead_id" value={leadId || ""} />
        <input type="hidden" name="org_id" value={orgId || ""} />
        <input type="hidden" name="deal_id" value={dealId || ""} />
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Send the updated quotation…"
          aria-label="What needs doing"
        />
        <div className="row" style={{ gap: 6 }}>
          <input
            type="datetime-local"
            name="due_at"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
            aria-label="When it is due"
          />
          {people.length > 0 && (
            <select
              name="assigned_to"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              style={{ width: 130 }}
              aria-label="Who it is for"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === meId ? "Me" : p.name}
                </option>
              ))}
            </select>
          )}
          <button className="btn sm" disabled={pending || !title.trim()}>
            Add
          </button>
        </div>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <p className="empty" style={{ padding: "6px 0", margin: 0 }}>
          Nothing scheduled on this record.
        </p>
      ) : (
        <ul className="tasklist">
          {[...open, ...done].map((t) => (
            <li key={t.id} className={t.done_at ? "is-done" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={!!t.done_at}
                  disabled={busy}
                  onChange={(e) => toggle(t.id, e.target.checked)}
                />
                <span className="tasklist__title">{t.title}</span>
              </label>
              <span className={`tasklist__due${overdue(t) ? " is-over" : ""}`}>
                {t.assignee ? `${t.assignee} · ` : ""}
                {t.due_at ? fmt(t.due_at) : "No date"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function overdue(t: Task) {
  if (t.done_at || !t.due_at) return false;
  const dt = new Date(t.due_at.replace(" ", "T"));
  return !isNaN(dt.getTime()) && dt < new Date();
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

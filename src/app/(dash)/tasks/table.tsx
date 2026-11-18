"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignTaskAction,
  completeTaskAction,
  removeTaskAction,
} from "@/app/actions/tasks-global";
import type { DashUser, Task } from "@/lib/types";

export default function TaskTable({
  tasks,
  people,
  meId,
  isAdmin,
  empty,
}: {
  tasks: Task[];
  people: DashUser[];
  meId: number;
  isAdmin: boolean;
  empty: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  function run(fn: () => Promise<{ ok: true } | { error: string }>) {
    setError("");
    start(async () => {
      const res = await fn();
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  function remove(task: Task) {
    if (!window.confirm(`Remove "${task.title}"? The record it hangs off is untouched.`)) return;
    run(() => removeTaskAction(task.id));
  }

  const canManage = (t: Task) => isAdmin || t.created_by === meId;
  const canTick = (t: Task) => canManage(t) || t.assigned_to === meId;

  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      {error && (
        <div className="msg err" style={{ margin: 14 }}>
          {error}
        </div>
      )}
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 34 }} aria-label="Done" />
            <th>Task</th>
            <th>Who</th>
            <th>Due</th>
            <th>Priority</th>
            <th aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <p className="empty" style={{ padding: 24, margin: 0 }}>
                  {empty}
                </p>
              </td>
            </tr>
          ) : (
            tasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!t.done_at}
                    disabled={busy || !canTick(t)}
                    onChange={(e) => run(() => completeTaskAction(t.id, e.target.checked))}
                    aria-label={t.done_at ? `Reopen ${t.title}` : `Complete ${t.title}`}
                  />
                </td>
                <td>
                  <span
                    style={{
                      fontWeight: 600,
                      textDecoration: t.done_at ? "line-through" : undefined,
                      color: t.done_at ? "var(--muted)" : undefined,
                    }}
                  >
                    {t.title}
                  </span>
                  {t.detail && (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, marginTop: 2 }}>
                      {t.detail}
                    </div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {t.deal_id > 0 && (
                      <Link href={`/deals/${t.deal_id}`}>{t.deal_title || `Deal #${t.deal_id}`}</Link>
                    )}
                    {t.org_id > 0 && (
                      <Link href={`/organizations/${t.org_id}`}>{t.org_name || `Organisation #${t.org_id}`}</Link>
                    )}
                    {t.lead_id > 0 && (
                      <Link href={`/leads/${t.lead_id}`}>
                        {t.lead_name || t.lead_company || `Lead #${t.lead_id}`}
                      </Link>
                    )}
                    {!t.deal_id && !t.org_id && !t.lead_id && (
                      <span style={{ color: "var(--muted)" }}>No record attached</span>
                    )}
                  </div>
                </td>
                <td className="tbl-keep">
                  {canManage(t) && people.length > 0 ? (
                    <select
                      value={t.assigned_to ?? ""}
                      disabled={busy}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id > 0) run(() => assignTaskAction(t.id, id));
                      }}
                      style={{ width: "auto", maxWidth: 150 }}
                      aria-label={`Who ${t.title} is for`}
                    >
                      {t.assigned_to === null && (
                        <option value="" disabled>
                          Unassigned
                        </option>
                      )}
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id === meId ? "Me" : p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: t.assignee ? undefined : "var(--muted)" }}>
                      {t.assignee || "Unassigned"}
                    </span>
                  )}
                  {t.assigned_by_name && t.assigned_by_name !== t.created_by_name && (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>by {t.assigned_by_name}</div>
                  )}
                </td>
                <td className={`tbl-keep${overdue(t) ? " is-over" : ""}`} style={overdue(t) ? { color: "var(--err)", fontWeight: 600 } : undefined}>
                  {t.due_at ? fmt(t.due_at) : <span style={{ color: "var(--muted)" }}>No date</span>}
                </td>
                <td className="tbl-keep">
                  <span style={{ color: priorityColour(t.priority), fontWeight: t.priority === "high" ? 600 : 400 }}>
                    {t.priority === "high" ? "High" : t.priority === "low" ? "Low" : "Normal"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {canManage(t) && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ color: "var(--err)" }}
                      disabled={busy}
                      onClick={() => remove(t)}
                      aria-label={`Remove ${t.title}`}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
    : dt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function priorityColour(p: string) {
  if (p === "high") return "var(--err)";
  if (p === "low") return "var(--muted)";
  return "var(--ink)";
}

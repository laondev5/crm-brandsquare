"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTrackerAction,
  saveTrackerAction,
  setTrackerStatusAction,
} from "@/app/actions/tracker";
import {
  isDone,
  isOverdue,
  PRIORITIES,
  PRIORITY_HINT,
  type TrackerDef,
  type TrackerField,
} from "@/lib/trackers";
import type { TrackerRecord } from "@/lib/types";

/** Reads a field off a record, whichever side of the schema it lives on. */
function valueOf(rec: TrackerRecord, f: TrackerField): string {
  switch (f.column) {
    case "title":
      return rec.title;
    case "status":
      return rec.status;
    case "priority":
      return rec.priority;
    case "owner_name":
      return rec.owner_name;
    case "entry_date":
      return rec.entry_date ?? "";
    case "due_date":
      return rec.due_date ?? "";
    default:
      return rec.data?.[f.key] ?? "";
  }
}

function fmtDate(d: string) {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TrackerView({
  def,
  rows,
  canSeeOwner,
}: {
  def: TrackerDef;
  rows: TrackerRecord[];
  canSeeOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TrackerRecord | "new" | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const cols = def.fields.filter((f) => f.inTable);

  function changeStatus(rec: TrackerRecord, status: string) {
    setErr("");
    setBusyId(rec.id);
    startTransition(async () => {
      const res = await setTrackerStatusAction(rec.id, def.key, status);
      setBusyId(null);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  }

  function remove(rec: TrackerRecord) {
    if (!confirm(`Delete "${rec.title}"? This cannot be undone.`)) return;
    setErr("");
    setBusyId(rec.id);
    startTransition(async () => {
      const res = await deleteTrackerAction(rec.id, def.key);
      setBusyId(null);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={() => setEditing("new")}>
          Add entry
        </button>
      </div>

      <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
        {rows.length === 0 ? (
          <p className="empty">
            Nothing here yet. Use <strong>Add entry</strong> to log the first one.
          </p>
        ) : (
          <table className="tbl tk-tbl">
            <thead>
              <tr>
                {cols.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                {canSeeOwner && <th style={{ width: 120 }}>Logged by</th>}
                <th style={{ width: 92 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((rec) => {
                const over = isOverdue(rec.due_date, rec.status);
                return (
                  <tr key={rec.id} className={over ? "is-overdue" : ""}>
                    {cols.map((f) => {
                      const v = valueOf(rec, f);
                      return (
                        <td key={f.key} data-l={f.label}>
                          {f.column === "title" ? (
                            <button className="tk-title" onClick={() => setEditing(rec)}>
                              {v || "(untitled)"}
                            </button>
                          ) : f.column === "status" ? (
                            <select
                              className="tk-status"
                              value={rec.status}
                              disabled={busyId === rec.id}
                              onChange={(e) => changeStatus(rec, e.target.value)}
                              aria-label={`Status for ${rec.title}`}
                            >
                              {!def.statuses.includes(rec.status) && (
                                <option value={rec.status}>{rec.status || "—"}</option>
                              )}
                              {def.statuses.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : f.type === "date" ? (
                            <span className={over && f.column === "due_date" ? "tk-over" : ""}>
                              {fmtDate(v)}
                            </span>
                          ) : f.column === "priority" ? (
                            v ? (
                              <span className={`pill p-${v.toLowerCase()}`}>{v}</span>
                            ) : (
                              "—"
                            )
                          ) : (
                            v || "—"
                          )}
                        </td>
                      );
                    })}
                    {canSeeOwner && (
                      <td data-l="Logged by">{rec.created_by_name || rec.owner_name || "—"}</td>
                    )}
                    <td data-l="">
                      <div className="tk-actions">
                        <button className="btn ghost sm" onClick={() => setEditing(rec)}>
                          Edit
                        </button>
                        <button
                          className="btn danger sm"
                          disabled={busyId === rec.id}
                          onClick={() => remove(rec)}
                          aria-label={`Delete ${rec.title}`}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Editor
          def={def}
          record={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function Editor({
  def,
  record,
  onClose,
  onSaved,
}: {
  def: TrackerDef;
  record: TrackerRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(saveTrackerAction, {});
  const firstRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="tk-back" onMouseDown={onClose} role="presentation">
      <div
        className="tk-modal"
        role="dialog"
        aria-modal="true"
        aria-label={record ? `Edit entry` : `Add to ${def.label}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="tk-modal__head">
          <h2>{record ? "Edit entry" : `Add to ${def.label}`}</h2>
          <button className="tk-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <form action={action} className="tk-modal__body">
          <input type="hidden" name="tracker" value={def.key} />
          {record && <input type="hidden" name="id" value={record.id} />}

          {state.error && (
            <div className="msg err" role="alert">
              {state.error}
            </div>
          )}

          <div className="tk-fields">
            {def.fields.map((f, i) => {
              const current = record ? valueOf(record, f) : "";
              const defaultVal =
                current || (!record && f.column === "entry_date" ? today : "");
              const wide = f.type === "textarea";

              return (
                <label className={`f${wide ? " tk-wide" : ""}`} key={f.key}>
                  <span>{f.label}</span>

                  {f.type === "textarea" ? (
                    <textarea name={`f_${f.key}`} defaultValue={defaultVal} rows={3} />
                  ) : f.type === "select" ? (
                    <select
                      name={`f_${f.key}`}
                      defaultValue={defaultVal}
                      ref={i === 0 ? (el) => void (firstRef.current = el) : undefined}
                    >
                      <option value="">—</option>
                      {(f.column === "status"
                        ? def.statuses
                        : f.column === "priority"
                        ? PRIORITIES
                        : f.options ?? []
                      ).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "yesno" ? (
                    <select name={`f_${f.key}`} defaultValue={defaultVal}>
                      <option value="">—</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  ) : (
                    <input
                      type={
                        f.type === "date"
                          ? "date"
                          : f.type === "time"
                          ? "time"
                          : f.type === "number"
                          ? "number"
                          : f.type === "url"
                          ? "url"
                          : "text"
                      }
                      name={`f_${f.key}`}
                      defaultValue={defaultVal}
                      placeholder={f.placeholder}
                      ref={i === 0 ? (el) => void (firstRef.current = el) : undefined}
                    />
                  )}

                  {f.column === "priority" && (
                    <small className="tk-help">
                      {Object.entries(PRIORITY_HINT)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </small>
                  )}
                </label>
              );
            })}
          </div>

          <footer className="tk-modal__foot">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" disabled={pending}>
              {pending ? "Saving…" : record ? "Save changes" : "Add entry"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/** Re-exported so the table can grey out finished rows without importing twice. */
export { isDone };

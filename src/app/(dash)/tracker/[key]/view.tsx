"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTrackerAction,
  saveTrackerAction,
  setTrackerStatusAction,
} from "@/app/actions/tracker";
import {
  isDone,
  isOverdue,
  NO_VALUE,
  PRIORITIES,
  PRIORITY_HINT,
  type TrackerDef,
  type TrackerField,
} from "@/lib/trackers";
import type { TrackerRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateField, TimeField } from "@/components/date-field";

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

/**
 * The tracker editor, built from shadcn primitives.
 *
 * Radix's Dialog brings the focus trap, Escape handling and scroll lock that
 * the hand-rolled modal did by hand, so all of that is gone from here.
 *
 * Its Select is not a native <select>; passing `name` makes Radix render a
 * hidden native one alongside it, which is what keeps the plain FormData
 * parsing in saveTrackerAction working untouched.
 */
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

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  const today = new Date().toISOString().slice(0, 10);

  const inputType = (t: TrackerField["type"]) =>
    t === "date" ? "date" : t === "time" ? "time" : t === "number" ? "number" : t === "url" ? "url" : "text";

  const optionsFor = (f: TrackerField): readonly string[] =>
    f.column === "status"
      ? def.statuses
      : f.column === "priority"
        ? PRIORITIES
        : f.type === "yesno"
          ? (["Yes", "No"] as const)
          : (f.options ?? []);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{record ? "Edit entry" : `Add to ${def.label}`}</DialogTitle>
          <DialogDescription>{def.blurb}</DialogDescription>
        </DialogHeader>

        <form action={action} className="grid gap-5">
          <input type="hidden" name="tracker" value={def.key} />
          {record && <input type="hidden" name="id" value={record.id} />}

          {state.error && (
            <p
              role="alert"
              className="rounded-md border-[1px] border-solid border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {def.fields.map((f) => {
              const current = record ? valueOf(record, f) : "";
              const defaultVal = current || (!record && f.column === "entry_date" ? today : "");
              const name = `f_${f.key}`;
              const isChoice = f.type === "select" || f.type === "yesno";

              return (
                <div
                  key={f.key}
                  className={cn("grid gap-1.5", f.type === "textarea" && "sm:col-span-2")}
                >
                  <Label htmlFor={name}>{f.label}</Label>

                  {f.type === "textarea" ? (
                    <Textarea id={name} name={name} defaultValue={defaultVal} rows={3} />
                  ) : f.type === "date" ? (
                    <DateField id={name} name={name} defaultValue={defaultVal} />
                  ) : f.type === "time" ? (
                    <TimeField id={name} name={name} defaultValue={defaultVal} />
                  ) : isChoice ? (
                    <Select name={name} defaultValue={defaultVal || undefined}>
                      <SelectTrigger id={name}>
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_VALUE}>Not set</SelectItem>
                        {optionsFor(f).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={name}
                      name={name}
                      type={inputType(f.type)}
                      defaultValue={defaultVal}
                      placeholder={f.placeholder}
                    />
                  )}

                  {f.column === "priority" && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {Object.entries(PRIORITY_HINT)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : record ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Re-exported so the table can grey out finished rows without importing twice. */
export { isDone };

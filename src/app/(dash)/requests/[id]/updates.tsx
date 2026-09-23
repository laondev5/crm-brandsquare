"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addRequestNoteAction, updateRequestAction } from "@/app/actions/requests";
import type { MachineRequestEvent } from "@/lib/types";

function when(s: string) {
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime())
    ? s
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function describe(e: MachineRequestEvent) {
  switch (e.type) {
    case "created":
      return <>logged the request</>;
    case "status":
      return (
        <>
          moved it from <b>{e.from_value}</b> to <b>{e.to_value}</b>
        </>
      );
    case "breakdown":
      return (
        <>
          set the breakdown to <b>{e.to_value}</b>
        </>
      );
    case "assigned_procurement":
      return (
        <>
          gave procurement to <b>{e.to_value || "nobody"}</b>
        </>
      );
    case "assigned_sales":
      return (
        <>
          gave sales to <b>{e.to_value || "nobody"}</b>
        </>
      );
    case "next_action":
      return (
        <>
          set the next action: <b>{e.to_value}</b>
        </>
      );
    case "last_update":
      return <>updated the status line</>;
    default:
      return <>updated the request</>;
  }
}

/**
 * What has happened to this request, and the box for saying what just did.
 *
 * Writing an update also becomes the request's "Last update" on the list, so
 * the queue reads as a set of sentences rather than a set of timestamps.
 */
export default function RequestUpdates({
  id,
  log,
  canEdit,
  lastUpdate,
  nextAction,
}: {
  id: number;
  log: MachineRequestEvent[];
  canEdit: boolean;
  lastUpdate: string;
  nextAction: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [next, setNext] = useState(nextAction);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();

  const post = () => {
    if (!note.trim()) return;
    setErr("");
    start(async () => {
      const res = await addRequestNoteAction(id, note);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  };

  const saveNext = () => {
    setErr("");
    start(async () => {
      const res = await updateRequestAction(id, { next_action: next.trim() });
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  return (
    <>
      <div className="card">
        <h2>Where it stands</h2>
        <table className="kv">
          <tbody>
            <tr>
              <th style={{ width: 110 }}>Last update</th>
              <td>{lastUpdate || <span style={{ color: "var(--muted)" }}>Nothing recorded yet</span>}</td>
            </tr>
          </tbody>
        </table>

        {canEdit && (
          <>
            <label className="f" style={{ marginTop: 10 }}>
              <span>Next action</span>
              <div className="row" style={{ gap: 6 }}>
                <input
                  type="text"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Awaiting specification"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn ghost sm" disabled={busy || next === nextAction} onClick={saveNext}>
                  Save
                </button>
              </div>
            </label>

            <label className="f">
              <span>What just happened?</span>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Manufacturer contacted, waiting on pricing for 2 TPH."
              />
            </label>
            <button className="btn sm" disabled={busy || !note.trim()} onClick={post}>
              {busy ? "Saving…" : "Add update"}
            </button>
          </>
        )}
        {err && <div className="msg err">{err}</div>}
      </div>

      <div className="card">
        <h2>History</h2>
        {log.length === 0 ? (
          <p className="empty" style={{ margin: 0 }}>
            Nothing yet.
          </p>
        ) : (
          <ul className="tl">
            {log.map((e) => (
              <li key={e.id}>
                {e.note ? <span>{e.note}</span> : <span>{describe(e)}</span>}
                <small>
                  {e.actor_name || "Someone"} · {when(e.created_at)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

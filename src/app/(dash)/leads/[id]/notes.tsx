"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteNoteAction, editNoteAction } from "@/app/actions/leads";
import { noteColor, type Note } from "@/lib/types";

export default function Notes({
  leadId,
  notes,
  meId,
  serverNow,
}: {
  leadId: number;
  notes: Note[];
  meId: number;
  /** Server clock in unix seconds when this page was rendered. */
  serverNow: number;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // The edit window is measured against the server's clock, not the visitor's,
  // which can be badly out. Anchor to the server time we were handed, then let
  // it run locally so a window closing while the page sits open is noticed.
  const [nowSec, setNowSec] = useState(serverNow);
  useEffect(() => {
    const offset = serverNow * 1000 - Date.now();
    const tick = () => setNowSec(Math.floor((Date.now() + offset) / 1000));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [serverNow]);

  const textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editingId !== null) textRef.current?.focus();
  }, [editingId]);

  function startEdit(n: Note) {
    setError("");
    setEditingId(n.id);
    setDraft(n.body);
  }

  function save(n: Note) {
    const body = draft.trim();
    if (!body) {
      setError("A note cannot be empty.");
      return;
    }
    setBusyId(n.id);
    setError("");
    startTransition(async () => {
      const res = await editNoteAction(leadId, n.id, body);
      setBusyId(null);
      if ("error" in res) {
        setError(res.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function remove(n: Note) {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setBusyId(n.id);
    setError("");
    startTransition(async () => {
      const res = await deleteNoteAction(leadId, n.id);
      setBusyId(null);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  if (notes.length === 0) {
    return <p className="empty" style={{ padding: "18px 0" }}>No notes yet.</p>;
  }

  return (
    <>
      {error && (
        <div className="msg err" role="alert">
          {error}
        </div>
      )}

      <div className="stickies">
        {notes.map((n) => {
          const mine = n.author_id !== null && n.author_id === meId;
          const left = n.editable_until - nowSec;
          const canEdit = mine && left > 0;
          const editing = editingId === n.id;

          return (
            <article key={n.id} className={`sticky sticky--${noteColor(n)}`}>
              {editing ? (
                <>
                  <label className="sr-only" htmlFor={`note-${n.id}`}>
                    Edit note
                  </label>
                  <textarea
                    id={`note-${n.id}`}
                    ref={textRef}
                    className="sticky__edit"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                  />
                  <div className="sticky__actions">
                    <button
                      className="btn sm"
                      disabled={busyId === n.id}
                      onClick={() => save(n)}
                    >
                      {busyId === n.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        setEditingId(null);
                        setError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="sticky__body">{n.body}</p>
                  <footer className="sticky__foot">
                    <span className="sticky__who">{n.author_name}</span>
                    <span className="sticky__when">
                      {fmtDT(n.created_at)}
                      {n.updated_at && " · edited"}
                    </span>
                  </footer>

                  {canEdit && (
                    <div className="sticky__actions">
                      <button className="sticky__btn" onClick={() => startEdit(n)}>
                        Edit
                      </button>
                      <button
                        className="sticky__btn is-danger"
                        disabled={busyId === n.id}
                        onClick={() => remove(n)}
                      >
                        Delete
                      </button>
                      <span className="sticky__left" title="How long you can still change this">
                        {fmtLeft(left)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function fmtDT(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Rounds up, so a note never reads "0m left" while it is still editable. */
function fmtLeft(sec: number) {
  const mins = Math.ceil(sec / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return `${h}h left`;
  }
  return `${Math.max(1, mins)}m left`;
}

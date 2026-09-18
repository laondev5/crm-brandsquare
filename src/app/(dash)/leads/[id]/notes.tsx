"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteNoteAction, editNoteAction } from "@/app/actions/leads";
import { noteColor, type Note } from "@/lib/types";

export interface Ownership {
  /** Who held the lead, as the activity trail named them. */
  name: string;
  /** When they took it. */
  since: string;
  /** Who handed it over — "Auto-assign" when the system did. */
  by: string;
}

export default function Notes({
  leadId,
  notes,
  meId,
  serverNow,
  owners = [],
  currentOwner = null,
}: {
  leadId: number;
  notes: Note[];
  meId: number;
  /** Server clock in unix seconds when this page was rendered. */
  serverNow: number;
  /** Everyone who has held this lead, oldest first. */
  owners?: Ownership[];
  currentOwner?: string | null;
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

  // A lead that has changed hands: the new owner should read what the last
  // person learned before picking up the phone.
  const previous = owners.filter((o) => o.name !== currentOwner).map((o) => o.name);
  const byPrevious = notes.filter((n) => n.author_name && n.author_name !== currentOwner && previous.includes(n.author_name));
  const countBy = (name: string) => notes.filter((n) => n.author_name === name).length;

  const history =
    owners.length > 0 ? (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12.5 }}>
        <span style={{ color: "var(--muted)", fontWeight: 600 }}>Handled by:</span>
        {owners.map((o, i) => {
          const now = i === owners.length - 1 && o.name === currentOwner;
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: "var(--muted)" }}>→</span>}
              <span
                title={`Since ${fmtDT(o.since)}${o.by ? ` · assigned by ${o.by}` : ""}`}
                className="pill"
                style={{
                  background: now ? "var(--accent)" : "#f1efe8",
                  color: now ? "var(--p)" : "#46434f",
                  fontWeight: 600,
                }}
              >
                {o.name} · {fmtDay(o.since)}
                {countBy(o.name) > 0 && ` · ${countBy(o.name)} note${countBy(o.name) === 1 ? "" : "s"}`}
                {now && " · now"}
              </span>
            </span>
          );
        })}
      </div>
    ) : null;

  if (notes.length === 0) {
    return (
      <>
        {history}
        <p className="empty" style={{ padding: "18px 0" }}>No notes yet.</p>
      </>
    );
  }

  return (
    <>
      {history}
      {byPrevious.length > 0 && (
        <div className="msg warn" style={{ fontSize: 12.5 }}>
          This lead was handled by <strong>{[...new Set(byPrevious.map((n) => n.author_name))].join(", ")}</strong>{" "}
          before{currentOwner ? ` ${currentOwner}` : ""}. Their {byPrevious.length} note
          {byPrevious.length === 1 ? " is below — read it" : "s are below — read them"} before contacting the lead.
        </div>
      )}
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
                  {/* Who wrote it, up front: when a lead changes hands, the
                      first thing the new owner needs is whose words these are. */}
                  <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,.12)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#46434f",
                        flexShrink: 0,
                      }}
                    >
                      {(n.author_name || "?").trim().charAt(0).toUpperCase()}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: 12.5, color: "#2e2b38" }}>
                        {n.author_name || "Unknown"}
                        {mine && <span style={{ fontWeight: 400, color: "#6a6873" }}> (you)</span>}
                      </strong>
                      <span style={{ fontSize: 11, color: "#6a6873" }}>
                        {fmtDT(n.created_at)}
                        {n.updated_at && " · edited"}
                        {n.author_name && currentOwner && n.author_name !== currentOwner && previous.includes(n.author_name) &&
                          " · previous owner"}
                      </span>
                    </span>
                  </header>
                  <p className="sticky__body">{n.body}</p>

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

function fmtDay(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

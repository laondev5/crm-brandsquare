"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { addDealNoteAction, deleteDealNoteAction } from "@/app/actions/deals";
import type { DealNote } from "@/lib/types";

export default function DealNotes({
  dealId,
  notes,
  canWrite,
  meId,
  isAdmin,
}: {
  dealId: number;
  notes: DealNote[];
  canWrite: boolean;
  meId: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function add() {
    if (!body.trim()) return;
    start(async () => {
      setError(null);
      const res = await addDealNoteAction(dealId, body);
      if ("error" in res) setError(res.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  function remove(id: number) {
    start(async () => {
      setError(null);
      const res = await deleteDealNoteAction(dealId, id);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="card">
      <h2>Notes</h2>
      {error && <div className="msg err">{error}</div>}

      {canWrite && (
        <div style={{ marginBottom: 14 }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a deal note"
            aria-label="Deal note"
            style={{ width: "100%" }}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn sm" onClick={add} disabled={busy || !body.trim()}>
              {busy ? "Saving…" : "Add note"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="empty" style={{ padding: "12px 0", margin: 0 }}>
          No notes recorded for this deal.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {notes.map((note) => (
            <div key={note.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <div className="row" style={{ gap: 8 }}>
                <strong style={{ fontSize: 12.5 }}>{note.author_name || "—"}</strong>
                <small style={{ color: "var(--muted)" }}>{note.created_at?.slice(0, 16)}</small>
                <div style={{ flex: 1 }} />
                {(isAdmin || note.author_id === meId) && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ color: "var(--err)" }}
                    onClick={() => remove(note.id)}
                    disabled={busy}
                    aria-label="Remove note"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                {note.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveBlockerAction } from "@/app/actions/work";
import type { Workday } from "@/lib/types";

function day(d: string) {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * The in-app half of being tagged on a blocker (the other half is the email).
 *
 * Open ones sit at the top of My work until they are marked cleared; cleared
 * ones stay for a week, greyed, so an accidental click can be undone and the
 * writer can see it was dealt with.
 */
export default function TaggedBlockers({ blockers }: { blockers: Workday[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [, start] = useTransition();

  if (blockers.length === 0) return null;
  const open = blockers.filter((b) => !b.blocker_resolved_at);

  const act = (id: number, reopen: boolean) => {
    setBusy(id);
    setErr("");
    start(async () => {
      const res = await resolveBlockerAction(id, reopen);
      setBusy(null);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="card" style={{ marginBottom: 18, borderColor: open.length ? "#f3c99d" : undefined }}>
      <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Blockers waiting on you</h2>
        {open.length > 0 && <span className="pill s-disabled">{open.length} open</span>}
      </div>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {blockers.map((b) => {
          const done = !!b.blocker_resolved_at;
          return (
            <div
              key={b.id}
              style={{
                border: "1px solid var(--line)",
                borderLeft: `4px solid ${done ? "var(--ok)" : "var(--p)"}`,
                borderRadius: 10,
                padding: "10px 14px",
                background: done ? "#fafafc" : "#fff",
                opacity: done ? 0.75 : 1,
              }}
            >
              <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ color: "var(--ink)" }}>{b.name || "A teammate"}</strong>
                <small style={{ color: "var(--muted)" }}>{day(b.work_date)}</small>
                <div style={{ flex: 1 }} />
                {done ? (
                  <button className="btn ghost sm" disabled={busy === b.id} onClick={() => act(b.id!, true)}>
                    Reopen
                  </button>
                ) : (
                  <button className="btn sm" disabled={busy === b.id} onClick={() => act(b.id!, false)}>
                    {busy === b.id ? "Saving…" : "Mark as cleared"}
                  </button>
                )}
              </div>
              <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", color: done ? "var(--muted)" : "var(--ink)" }}>
                {b.blockers}
              </p>
              {done && <small style={{ color: "var(--ok)", fontWeight: 600 }}>✓ Cleared</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

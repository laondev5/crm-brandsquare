"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMachineSourcesAction } from "@/app/actions/requests";
import type { MachineSource } from "@/lib/types";

/**
 * Where enquiries come from, as the business receives them.
 *
 * The whole list is saved at once, in the order shown, because the order is
 * part of it: whatever people pick most often belongs at the top of the
 * dropdown. A source already on requests can be retired but never deleted,
 * so those requests keep saying where they came from.
 */
export default function SourceEditor({ initial }: { initial: MachineSource[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<MachineSource[]>(initial);
  const [adding, setAdding] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [busy, start] = useTransition();

  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);

  const set = (i: number, patch: Partial<MachineSource>) =>
    setRows((all) => all.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  const move = (i: number, by: number) =>
    setRows((all) => {
      const to = i + by;
      if (to < 0 || to >= all.length) return all;
      const next = [...all];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });

  const add = () => {
    const label = adding.trim();
    if (!label) return;
    setRows((all) => [...all, { key: "", label }]);
    setAdding("");
  };

  const save = () =>
    start(async () => {
      const res = await saveMachineSourcesAction(rows.filter((r) => r.label.trim()));
      setMsg("error" in res ? { error: res.error } : { ok: "Saved. The list is live on every request form." });
      if (!("error" in res)) router.refresh();
    });

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h2>Where enquiries come from</h2>
      {msg.error && <div className="msg err">{msg.error}</div>}
      {msg.ok && <div className="msg ok">{msg.ok}</div>}

      <ul className="src-list">
        {rows.map((r, i) => (
          <li key={r.key || `new-${i}`} className={r.archived ? "is-off" : ""}>
            <span className="src-order">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                ↓
              </button>
            </span>
            <input
              type="text"
              value={r.label}
              aria-label={`Name of source ${i + 1}`}
              onChange={(e) => set(i, { label: e.target.value })}
            />
            <span className="src-used">{r.used ? `${r.used} request${r.used === 1 ? "" : "s"}` : r.key ? "unused" : "new"}</span>
            {r.archived ? (
              <button type="button" className="btn ghost sm" onClick={() => set(i, { archived: false })}>
                Bring back
              </button>
            ) : (
              <button type="button" className="btn ghost sm" onClick={() => set(i, { archived: true })}>
                Retire
              </button>
            )}
            <button
              type="button"
              className="btn ghost sm"
              style={{ color: "var(--err)" }}
              disabled={!!r.used}
              title={r.used ? "It is on requests already — retire it instead" : "Remove it"}
              onClick={() => setRows((all) => all.filter((_, n) => n !== i))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="row" style={{ gap: 6, margin: "12px 0" }}>
        <input
          type="text"
          value={adding}
          placeholder="Add another — TikTok, trade fair, reseller…"
          aria-label="New source"
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn ghost" onClick={add} disabled={!adding.trim()}>
          Add
        </button>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn" disabled={busy || !dirty} onClick={save}>
          {busy ? "Saving…" : "Save list"}
        </button>
        {dirty && (
          <button className="btn ghost" disabled={busy} onClick={() => setRows(initial)}>
            Undo changes
          </button>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "14px 0 0" }}>
        <strong>Retire</strong> takes a source out of the dropdown but leaves it on the requests that
        already use it. A source in use cannot be removed outright, which is why Remove is greyed out
        for it. Renaming is safe: requests follow the new name.
      </p>
    </div>
  );
}

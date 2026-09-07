"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkUpdateAction } from "@/app/actions/bulk";
import type { DashUser, Pipeline } from "@/lib/types";

/**
 * Selection and bulk edit for the leads table.
 *
 * The table itself stays a server component. This wraps it and listens for
 * changes from the checkboxes inside, reading the selection back out of the
 * DOM — which means the rows keep rendering on the server, with no second
 * copy of the table markup to keep in step with the first.
 */
export default function BulkBar({
  children,
  subs,
  pipeline,
  isAdmin,
}: {
  children: React.ReactNode;
  subs: DashUser[];
  pipeline: Pipeline;
  isAdmin: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [stage, setStage] = useState("");
  const [owner, setOwner] = useState("");
  const [busy, startTransition] = useTransition();

  const boxes = () =>
    Array.from(box.current?.querySelectorAll<HTMLInputElement>("input[data-lead-id]") ?? []);

  const selected = () =>
    boxes()
      .filter((b) => b.checked)
      .map((b) => Number(b.dataset.leadId))
      .filter((n) => n > 0);

  const recount = () => setCount(selected().length);

  const setAll = (on: boolean) => {
    boxes().forEach((b) => {
      b.checked = on;
    });
    recount();
  };

  const apply = () => {
    const ids = selected();
    setErr("");
    setMsg("");
    if (!ids.length) return;

    startTransition(async () => {
      const res = await bulkUpdateAction({
        ids,
        status: stage || undefined,
        // "" means "leave the owner alone"; "0" is the explicit Unassigned.
        assignedTo: owner === "" ? undefined : Number(owner) || null,
      });

      if ("error" in res) {
        setErr(res.error);
        return;
      }

      setMsg(`Updated ${res.updated} lead${res.updated === 1 ? "" : "s"}.`);
      setStage("");
      setOwner("");
      setAll(false);
      router.refresh();
    });
  };

  return (
    <>
      {/* One handler for every checkbox inside, so the rows themselves need no
          JavaScript of their own. */}
      <div ref={box} onChange={recount}>
        <div className="row" style={{ marginBottom: 8, gap: 10 }}>
          <button type="button" className="btn ghost sm" onClick={() => setAll(true)}>
            Select all on this page
          </button>
          {count > 0 && (
            <button type="button" className="btn ghost sm" onClick={() => setAll(false)}>
              Clear
            </button>
          )}
        </div>
        {children}
      </div>

      {msg && <div className="msg ok">{msg}</div>}
      {err && <div className="msg err">{err}</div>}

      {count > 0 && (
        <div className="bulkbar">
          <strong>
            {count} lead{count === 1 ? "" : "s"} selected
          </strong>

          <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ width: 170 }}>
            <option value="">Move to stage…</option>
            {pipeline.stages.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Reassignment is admin-only, matching the single-lead panel. */}
          {isAdmin && (
            <select value={owner} onChange={(e) => setOwner(e.target.value)} style={{ width: 180 }}>
              <option value="">Assign to…</option>
              <option value="0">Unassigned</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn"
            disabled={busy || (!stage && owner === "")}
            onClick={apply}
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </div>
      )}
    </>
  );
}

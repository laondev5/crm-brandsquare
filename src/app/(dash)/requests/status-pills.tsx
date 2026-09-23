"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRequestAction } from "@/app/actions/requests";
import { MR_BREAKDOWNS, MR_STATUSES, type MachineRequest } from "@/lib/types";

/** The stage colour a status borrows, so the pipeline reads the same everywhere. */
export function statusTone(key: string) {
  return MR_STATUSES.find((s) => s.key === key)?.tone ?? "new";
}

export function StatusPill({ r }: { r: MachineRequest }) {
  return <span className={`pill s-${statusTone(r.status)}`}>{r.status_label}</span>;
}

export function BreakdownPill({ r }: { r: MachineRequest }) {
  const tone = r.breakdown_status === "provided" ? "s-active" : r.breakdown_status === "in_progress" ? "" : "s-disabled";
  return (
    <span className={`pill ${tone}`} title="Breakdown status">
      {r.breakdown_label}
    </span>
  );
}

/**
 * Both statuses, changeable where they are read.
 *
 * Moving a request along is the most frequent thing anyone does to one, so it
 * does not require opening it first — and the two run separately because the
 * breakdown is what sales are waiting on, whatever the request itself says.
 */
export default function StatusControls({
  r,
  canEdit,
  compact = false,
}: {
  r: MachineRequest;
  canEdit: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  if (!canEdit) {
    return (
      <div className="row" style={{ gap: 6 }}>
        <StatusPill r={r} />
        <BreakdownPill r={r} />
      </div>
    );
  }

  const set = (patch: { status?: string; breakdown_status?: string }) =>
    start(async () => {
      setErr("");
      const res = await updateRequestAction(r.id, patch);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });

  return (
    <div className={`mr-status${compact ? " is-compact" : ""}`}>
      <label>
        {!compact && <span>Request status</span>}
        <select
          value={r.status}
          disabled={busy}
          aria-label={`Status of ${r.ref}`}
          className={`mr-select s-${statusTone(r.status)}`}
          onChange={(e) => set({ status: e.target.value })}
        >
          {MR_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {!compact && <span>Breakdown</span>}
        <select
          value={r.breakdown_status}
          disabled={busy}
          aria-label={`Breakdown status of ${r.ref}`}
          className="mr-select"
          onChange={(e) => set({ breakdown_status: e.target.value })}
        >
          {MR_BREAKDOWNS.map((s) => (
            <option key={s.key} value={s.key}>
              Breakdown: {s.label}
            </option>
          ))}
        </select>
      </label>
      {err && <small style={{ color: "var(--err)" }}>{err}</small>}
    </div>
  );
}

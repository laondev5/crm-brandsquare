"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveLeadAction } from "@/app/actions/pipeline";
import type { Pipeline } from "@/lib/types";
import type { BoardColumn } from "./board";

type SortKey = "stage" | "name" | "owner" | "idle" | "received";

/**
 * The same pipeline as a table.
 *
 * The board answers "what shape is the pipeline"; this answers "find me that
 * one deal", which dragging cards around is bad at. It is built from the same
 * per-stage results as the board rather than a second query, so the two views
 * can never disagree about what is in the pipeline.
 */
export default function PipelineList({
  columns,
  pipeline,
  searchTerm = "",
}: {
  columns: BoardColumn[];
  pipeline: Pipeline;
  searchTerm?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("stage");
  const [desc, setDesc] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  // Stage order is the pipeline's own order, not alphabetical — Negotiation
  // belongs after Quotation Sent, whatever the letters say.
  const stageRank = useMemo(() => {
    const m = new Map<string, number>();
    pipeline.stages.forEach((s, i) => m.set(s.key, i));
    return m;
  }, [pipeline]);

  const rows = useMemo(() => {
    const flat = columns.flatMap((c) =>
      c.cards.map((card) => ({ ...card, stageLabel: c.label, colour: c.colour }))
    );

    const dir = desc ? -1 : 1;
    return flat.sort((a, b) => {
      switch (sort) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "owner":
          return dir * (a.owner ?? "").localeCompare(b.owner ?? "");
        case "idle":
          return dir * (a.idleDays - b.idleDays);
        case "received":
          return dir * a.received.localeCompare(b.received);
        default:
          return (
            dir *
            ((stageRank.get(a.status) ?? 99) - (stageRank.get(b.status) ?? 99) ||
              a.name.localeCompare(b.name))
          );
      }
    });
  }, [columns, sort, desc, stageRank]);

  const move = (id: number, status: string) => {
    setErr("");
    setBusyId(id);
    startTransition(async () => {
      const res = await moveLeadAction(id, status);
      setBusyId(null);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  const header = (key: SortKey, label: string, width?: number) => (
    <th style={width ? { width } : undefined}>
      <button
        className="tbl-sort"
        onClick={() => {
          if (sort === key) setDesc(!desc);
          else {
            setSort(key);
            setDesc(false);
          }
        }}
      >
        {label}
        {sort === key && <span aria-hidden="true">{desc ? " ↓" : " ↑"}</span>}
      </button>
    </th>
  );

  if (rows.length === 0) {
    return (
      <div className="card">
        <p className="empty">
          {searchTerm ? `Nothing matches ${searchTerm}.` : "No leads in the pipeline yet."}
        </p>
      </div>
    );
  }

  return (
    <>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              {header("name", "Name")}
              <th>Contact</th>
              {header("stage", "Stage", 210)}
              {header("owner", "Owner", 140)}
              {header("idle", "Idle", 90)}
              {header("received", "Received", 110)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.rot !== "none" ? `is-${r.rot}` : ""}>
                <td data-l="Name">
                  <Link href={`/leads/${r.id}`} className="name">
                    {r.name}
                  </Link>
                  {r.formName && (
                    <>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{r.formName}</small>
                    </>
                  )}
                </td>
                <td data-l="Contact">{r.email || r.phone || "—"}</td>

                {/* Changing stage from the row is the point of this view —
                    scanning a table and fixing what is obviously wrong. */}
                <td data-l="Stage">
                  <select
                    className="tk-status"
                    value={r.status}
                    disabled={busyId === r.id}
                    onChange={(e) => move(r.id, e.target.value)}
                    aria-label={`Stage for ${r.name}`}
                    style={{ borderLeft: `3px solid ${r.colour}` }}
                  >
                    {pipeline.stages.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>

                <td data-l="Owner">{r.owner ?? "Unassigned"}</td>
                <td data-l="Idle">
                  <span className={r.rot === "stale" ? "tk-over" : undefined}>
                    {r.idleDays}d
                  </span>
                </td>
                <td data-l="Received">{r.received}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 14 }}>
        {rows.length} lead{rows.length === 1 ? "" : "s"} shown
      </p>
    </>
  );
}

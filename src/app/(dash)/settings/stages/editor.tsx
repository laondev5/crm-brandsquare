"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCampaignStagesAction, saveSharedStagesAction } from "@/app/actions/stages";
import type { Pipeline, Stage } from "@/lib/types";

/** A key the plugin will accept: lowercase, digits and underscores only. */
function keyFrom(label: string, taken: string[]) {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "stage";
  let key = base;
  let n = 2;
  while (taken.includes(key)) key = base + "_" + n++;
  return key;
}

const TYPE_LABEL: Record<Stage["type"], string> = {
  open: "In play",
  won: "Won",
  lost: "Lost",
};

/**
 * Edits one pipeline — either the shared one, or a single campaign's.
 *
 * Stages are held in local state and saved as a whole list rather than a row
 * at a time. Order is part of what is being edited, so a half-saved pipeline
 * would be a worse thing to leave behind than an unsaved one.
 */
export default function StageEditor({
  pipeline,
  formId,
  formName,
}: {
  pipeline: Pipeline;
  /** null when editing the shared pipeline. */
  formId: number | null;
  formName?: string;
}) {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>(pipeline.stages);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();

  const custom = pipeline.custom ?? false;
  const dirty = JSON.stringify(stages) !== JSON.stringify(pipeline.stages);

  const patch = (i: number, next: Partial<Stage>) =>
    setStages((list) => list.map((s, n) => (n === i ? { ...s, ...next } : s)));

  const move = (i: number, by: number) =>
    setStages((list) => {
      const to = i + by;
      if (to < 0 || to >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[to]] = [copy[to], copy[i]];
      return copy;
    });

  const remove = (i: number) => {
    const s = stages[i];
    const ok = confirm(
      "Remove " + s.label + "? Any lead sitting in it moves to the first stage of this pipeline."
    );
    if (!ok) return;
    setStages((list) => list.filter((_, n) => n !== i));
  };

  // New stages land above the closing pair, which is where a new step in a
  // sales process almost always belongs — nothing comes after Won and Lost.
  const add = () =>
    setStages((list) => {
      const closing = list.filter((s) => s.type !== "open").length;
      const at = Math.max(0, list.length - closing);
      const fresh: Stage = {
        key: keyFrom("New stage", list.map((s) => s.key)),
        label: "New stage",
        probability: 50,
        colour: "#64748b",
        type: "open",
      };
      return [...list.slice(0, at), fresh, ...list.slice(at)];
    });

  const run = (fn: () => Promise<{ ok: true; moved?: number } | { error: string }>) => {
    setErr("");
    setMsg("");
    start(async () => {
      const res = await fn();
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setMsg(
        res.moved
          ? "Saved. " +
              res.moved +
              " lead" +
              (res.moved === 1 ? "" : "s") +
              " moved to the first stage, because the stage they were in no longer exists."
          : "Saved."
      );
      router.refresh();
    });
  };

  const save = () =>
    run(() => (formId ? saveCampaignStagesAction(formId, stages) : saveSharedStagesAction(stages)));

  return (
    <>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}
      {msg && <div className="msg ok">{msg}</div>}

      {formId !== null && !custom && (
        <div className="msg warn" style={{ marginTop: 0 }}>
          <strong>{formName}</strong> currently uses the shared pipeline. Anything you save here
          becomes this campaign&rsquo;s own, and the shared one stops applying to it.
        </div>
      )}

      <div className="card" style={{ padding: "6px 8px", marginBottom: 16, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 78 }}>Order</th>
              <th>Stage</th>
              <th style={{ width: 90 }}>Colour</th>
              <th style={{ width: 130 }}>Likelihood</th>
              <th style={{ width: 110 }}>Outcome</th>
              <th style={{ width: 56 }} />
            </tr>
          </thead>
          <tbody>
            {stages.map((s, i) => (
              <tr key={s.key}>
                <td data-l="Order">
                  <div className="row" style={{ gap: 4 }}>
                    <button
                      className="btn ghost sm"
                      disabled={i === 0 || busy}
                      onClick={() => move(i, -1)}
                      aria-label={"Move " + s.label + " earlier"}
                    >
                      &uarr;
                    </button>
                    <button
                      className="btn ghost sm"
                      disabled={i === stages.length - 1 || busy}
                      onClick={() => move(i, 1)}
                      aria-label={"Move " + s.label + " later"}
                    >
                      &darr;
                    </button>
                  </div>
                </td>

                <td data-l="Stage">
                  <input
                    type="text"
                    value={s.label}
                    disabled={busy}
                    onChange={(e) => patch(i, { label: e.target.value })}
                    style={{ width: "100%" }}
                    aria-label={"Name of stage " + (i + 1)}
                  />
                </td>

                <td data-l="Colour">
                  <input
                    type="color"
                    value={s.colour}
                    disabled={busy}
                    onChange={(e) => patch(i, { colour: e.target.value })}
                    aria-label={"Colour for " + s.label}
                    style={{ width: 52, height: 30, padding: 2 }}
                  />
                </td>

                <td data-l="Likelihood">
                  {/* Only meaningful while a deal is still in play: a won deal
                      is not 90% likely, it has already happened. */}
                  {s.type === "open" ? (
                    <span className="row" style={{ gap: 6, alignItems: "center" }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.probability}
                        disabled={busy}
                        onChange={(e) =>
                          patch(i, {
                            probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                          })
                        }
                        style={{ width: 68 }}
                        aria-label={"Likelihood at " + s.label}
                      />
                      <span style={{ color: "var(--muted)" }}>%</span>
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>&mdash;</span>
                  )}
                </td>

                <td data-l="Outcome">
                  <span
                    className={
                      "pill " +
                      (s.type === "won" ? "s-active" : s.type === "lost" ? "s-disabled" : "")
                    }
                  >
                    {TYPE_LABEL[s.type]}
                  </span>
                </td>

                <td data-l="">
                  {/* The closing stages stay put. Without them a deal could be
                      started and never finished, and every conversion figure
                      in the CRM is computed from them. */}
                  {s.type === "open" && (
                    <button
                      className="btn danger sm"
                      disabled={busy}
                      onClick={() => remove(i)}
                      aria-label={"Remove " + s.label}
                    >
                      &times;
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn ghost" onClick={add} disabled={busy}>
          + Add stage
        </button>

        <div style={{ flex: 1 }} />

        {formId !== null && custom && (
          <button
            className="btn ghost"
            disabled={busy}
            onClick={() => {
              const ok = confirm(
                "Go back to the shared pipeline? This campaign's own stages are discarded, and any lead whose stage does not exist in the shared pipeline moves to its first stage."
              );
              if (!ok) return;
              run(() => saveCampaignStagesAction(formId, null));
            }}
          >
            Use the shared pipeline
          </button>
        )}

        <button className="btn" onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving…" : dirty ? "Save pipeline" : "Saved"}
        </button>
      </div>
    </>
  );
}

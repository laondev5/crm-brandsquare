"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { saveLeadPropertiesAction } from "@/app/actions/lead-props";
import { LEAD_PROPERTY_TYPES, type LeadProperty, type LeadPropertyType } from "@/lib/types";

type Row = LeadProperty & { optionsText: string };

const toRow = (p: LeadProperty): Row => ({ ...p, optionsText: p.options.join(", ") });

export default function PropertiesEditor({ initial }: { initial: LeadProperty[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const set = (i: number, patch: Partial<Row>) => {
    setOk("");
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setRows(next);
  };

  const save = () => {
    setErr("");
    setOk("");
    const properties: LeadProperty[] = rows
      .filter((r) => r.label.trim())
      .map((r) => ({
        key: r.key,
        label: r.label.trim(),
        type: r.type,
        in_list: r.in_list,
        options: r.type === "select" ? r.optionsText.split(",").map((o) => o.trim()).filter(Boolean) : [],
      }));
    start(async () => {
      const res = await saveLeadPropertiesAction(properties);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setRows(res.properties.map(toRow));
      setOk("Saved. Every lead now shows these properties.");
      router.refresh();
    });
  };

  return (
    <div className="card">
      {err && <div className="msg err">{err}</div>}
      {ok && <div className="msg ok">{ok}</div>}

      {rows.length === 0 ? (
        <p className="empty" style={{ padding: "8px 0 16px" }}>
          No properties yet. Add the first one — for example “Role”.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          {rows.map((r, i) => (
            <div
              key={r.key || `new-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(160px, 1.2fr) 150px minmax(160px, 1.5fr) auto auto",
                gap: 10,
                alignItems: "end",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <label className="f" style={{ margin: 0 }}>
                <span>Name</span>
                <input type="text" value={r.label} maxLength={80} placeholder="Role" onChange={(e) => set(i, { label: e.target.value })} />
              </label>
              <label className="f" style={{ margin: 0 }}>
                <span>Kind</span>
                <select value={r.type} onChange={(e) => set(i, { type: e.target.value as LeadPropertyType })}>
                  {LEAD_PROPERTY_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {r.type === "select" ? (
                <label className="f" style={{ margin: 0 }}>
                  <span>Choices, separated by commas</span>
                  <input type="text" value={r.optionsText} placeholder="Owner, Manager, Engineer, Buyer" onChange={(e) => set(i, { optionsText: e.target.value })} />
                </label>
              ) : (
                <small style={{ color: "var(--muted)", paddingBottom: 10 }}>
                  {r.key ? <>Stored as <code>{r.key}</code></> : "New"}
                </small>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, paddingBottom: 10, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={r.in_list} onChange={(e) => set(i, { in_list: e.target.checked })} />
                Show in leads list
              </label>
              <div className="row" style={{ gap: 4, paddingBottom: 4 }}>
                <button type="button" className="btn ghost sm" style={{ padding: 6 }} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" className="btn ghost sm" style={{ padding: 6 }} aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ padding: 6 }}
                  aria-label={`Remove ${r.label || "property"}`}
                  onClick={() => {
                    if (r.key && !confirm(`Remove “${r.label}”? Values already saved on leads stop showing.`)) return;
                    setRows(rows.filter((_, j) => j !== i));
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 10 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setRows([...rows, { key: "", label: "", type: "text", options: [], in_list: false, optionsText: "" }])}
        >
          + Add a property
        </button>
        <div className="spacer" />
        <button type="button" className="btn" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save properties"}
        </button>
      </div>
    </div>
  );
}

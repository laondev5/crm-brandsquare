"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLeadFieldAction, updateLeadPropsAction } from "@/app/actions/lead-props";
import { LEAD_PROPERTY_TYPES, type LeadProperty, type LeadPropertyType } from "@/lib/types";
import PropInput from "../prop-input";

/**
 * The business's own fields on this lead. Read-only until Edit, so a stray
 * click never changes anything; saving sends every field, and a cleared one
 * is removed.
 */
export default function LeadProperties({
  leadId,
  properties,
  values,
  isAdmin,
}: {
  leadId: number;
  properties: LeadProperty[];
  values: Record<string, string>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [field, setField] = useState({ label: "", type: "text" as LeadPropertyType, options: "", value: "" });

  const addField = () => {
    setErr("");
    start(async () => {
      const res = await addLeadFieldAction(leadId, {
        label: field.label,
        type: field.type,
        options: field.options.split(",").map((o) => o.trim()).filter(Boolean),
        value: field.value,
      });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setAdding(false);
      setField({ label: "", type: "text", options: "", value: "" });
      router.refresh();
    });
  };

  const addBox = adding ? (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: 12, marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <label className="f" style={{ margin: 0 }}>
          <span>Field name</span>
          <input type="text" value={field.label} maxLength={80} placeholder="Role" onChange={(e) => setField({ ...field, label: e.target.value })} />
        </label>
        <label className="f" style={{ margin: 0 }}>
          <span>Kind</span>
          <select value={field.type} onChange={(e) => setField({ ...field, type: e.target.value as LeadPropertyType })}>
            {LEAD_PROPERTY_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {field.type === "select" && (
          <label className="f" style={{ margin: 0 }}>
            <span>Choices, comma separated</span>
            <input type="text" value={field.options} placeholder="Owner, Manager, Engineer" onChange={(e) => setField({ ...field, options: e.target.value })} />
          </label>
        )}
        <label className="f" style={{ margin: 0 }}>
          <span>Value for this lead</span>
          {field.type === "select" ? (
            <select value={field.value} onChange={(e) => setField({ ...field, value: e.target.value })}>
              <option value="">—</option>
              {field.options.split(",").map((o) => o.trim()).filter(Boolean).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" value={field.value} onChange={(e) => setField({ ...field, value: e.target.value })} />
          )}
        </label>
      </div>
      <small style={{ display: "block", color: "var(--muted)", margin: "8px 0" }}>
        The field is added to every lead, so the whole team can fill it in.
      </small>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn sm" disabled={busy || !field.label.trim()} onClick={addField}>
          {busy ? "Adding…" : "Add field"}
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setAdding(false)}>
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  if (properties.length === 0) {
    return (
      <div className="card">
        <div className="row" style={{ alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Properties</h2>
          <div className="spacer" />
          {!adding && (
            <button type="button" className="btn ghost sm" onClick={() => setAdding(true)}>
              + Add a field
            </button>
          )}
        </div>
        {err && <div className="msg err" style={{ marginTop: 10 }}>{err}</div>}
        {!adding && (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Track your own details on leads — Role, State, Budget.
            {isAdmin && (
              <>
                {" "}
                <Link href="/settings/lead-properties" style={{ color: "var(--p)", fontWeight: 600 }}>
                  Manage lead properties
                </Link>
              </>
            )}
          </p>
        )}
        {addBox}
      </div>
    );
  }

  const save = () => {
    setErr("");
    const payload = Object.fromEntries(properties.map((p) => [p.key, draft[p.key] ?? ""]));
    start(async () => {
      const res = await updateLeadPropsAction(leadId, payload);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Properties</h2>
        <div className="spacer" />
        {!editing && !adding && (
          <>
            <button type="button" className="btn ghost sm" onClick={() => setAdding(true)}>
              + Add a field
            </button>
            <button type="button" className="btn ghost sm" style={{ marginLeft: 6 }} onClick={() => { setDraft(values); setEditing(true); }}>
              Edit
            </button>
          </>
        )}
      </div>
      {err && <div className="msg err">{err}</div>}

      {editing ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {properties.map((p) => (
              <label key={p.key} className="f" style={{ margin: 0 }}>
                <span>{p.label}</span>
                <PropInput prop={p} value={draft[p.key] ?? ""} onChange={(v) => setDraft({ ...draft, [p.key]: v })} />
              </label>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button type="button" className="btn" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <table className="kv">
          <tbody>
            {properties.map((p) => {
              const v = values[p.key];
              return (
                <tr key={p.key}>
                  <th>{p.label}</th>
                  <td>
                    {v ? (
                      p.type === "url" ? (
                        <a href={v} target="_blank" rel="noopener noreferrer">{v}</a>
                      ) : p.type === "email" ? (
                        <a href={`mailto:${v}`}>{v}</a>
                      ) : (
                        <span style={{ whiteSpace: "pre-wrap" }}>{v}</span>
                      )
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {addBox}
    </div>
  );
}

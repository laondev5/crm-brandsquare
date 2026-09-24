"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRequestAction, saveRequestFormAction } from "@/app/actions/requests";
import { ROLE_LABEL, orBlank, type MachineRequest, type MachineSource, type PersonName } from "@/lib/types";

/**
 * The request's own details, in the three groups people think in: who the
 * customer is, what they asked for, and who is handling it.
 *
 * Read-only until Edit is pressed, because most visits are to check something
 * rather than change it -- and a blank name should read as "Not provided",
 * not as an empty box somebody feels they must fill.
 */
export default function RequestForm({
  r,
  people,
  sources,
  canEdit,
  canDelete,
}: {
  r: MachineRequest;
  people: PersonName[];
  sources: MachineSource[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  // A retired source stays selectable on the request that already uses it.
  const pickable = sources.filter((s) => !s.archived || s.key === r.source);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(saveRequestFormAction.bind(null, r.id), null);
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  // Saved: straight back to reading it, with the new values on screen.
  useEffect(() => {
    if (state && "ok" in state) {
      setEditing(false);
      router.refresh();
    }
  }, [state, router]);

  const remove = () => {
    if (!confirm(`Delete ${r.ref}? Its history goes with it and this cannot be undone.`)) return;
    setErr("");
    start(async () => {
      const res = await deleteRequestAction(r.id);
      if ("error" in res) setErr(res.error);
      else router.push("/requests");
    });
  };

  if (!editing) {
    const row = (label: string, value: string, muted = false) => (
      <tr>
        <th>{label}</th>
        <td style={{ color: muted && !value ? "var(--muted)" : undefined }}>{value || "Not provided"}</td>
      </tr>
    );
    return (
      <>
        <div className="card">
          <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Customer</h2>
            <div style={{ flex: 1 }} />
            {canEdit && (
              <button className="btn ghost sm" onClick={() => setEditing(true)}>
                Edit details
              </button>
            )}
          </div>
          <table className="kv">
            <tbody>
              <tr>
                <th>Phone</th>
                <td>
                  <a href={`tel:${r.phone}`} style={{ fontWeight: 600 }}>
                    {r.phone}
                  </a>
                </td>
              </tr>
              {row("Name", r.name, true)}
              {row("Company", r.company, true)}
              <tr>
                <th>Email</th>
                <td>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : orBlank(r.email)}</td>
              </tr>
              {row("Location / country", r.country, true)}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Request</h2>
          <table className="kv">
            <tbody>
              {row("Machine requested", r.machine)}
              {row("Capacity", r.capacity)}
              {row("Requirements", r.requirements)}
              {row("Source", r.source_label)}
              {row("Additional notes", r.notes)}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Processing</h2>
          <table className="kv">
            <tbody>
              {row("Assigned procurement", r.procurement_name || "Unassigned")}
              {row("Assigned sales", r.sales_name || "Unassigned")}
              {row("Breakdown document", r.breakdown_link)}
            </tbody>
          </table>
          {err && <div className="msg err">{err}</div>}
          {canDelete && (
            <button className="btn ghost sm" style={{ color: "var(--err)" }} disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete request"}
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <form action={action} className="card mr-form">
      <h2>Edit request</h2>
      {state && "error" in state && <div className="msg err">{state.error}</div>}

      <h3 className="mr-group">Customer</h3>
      <div className="mr-form__row">
        <label className="f">
          <span>
            Phone <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input type="text" name="phone" defaultValue={r.phone} required />
        </label>
        <label className="f">
          <span>Location / country</span>
          <input type="text" name="country" defaultValue={r.country} placeholder="Not provided" />
        </label>
      </div>
      <div className="mr-form__row">
        <label className="f">
          <span>Name</span>
          <input type="text" name="name" defaultValue={r.name} placeholder="Not provided" />
        </label>
        <label className="f">
          <span>Company</span>
          <input type="text" name="company" defaultValue={r.company} placeholder="Not provided" />
        </label>
      </div>
      <label className="f">
        <span>Email</span>
        <input type="email" name="email" defaultValue={r.email} placeholder="Not provided" />
      </label>

      <h3 className="mr-group">Request</h3>
      <div className="mr-form__row">
        <label className="f">
          <span>Machine requested</span>
          <input type="text" name="machine" defaultValue={r.machine} />
        </label>
        <label className="f">
          <span>Capacity</span>
          <input type="text" name="capacity" defaultValue={r.capacity} placeholder="2 TPH" />
        </label>
      </div>
      <label className="f">
        <span>Requirements and details</span>
        <textarea name="requirements" rows={3} defaultValue={r.requirements} />
      </label>
      <div className="mr-form__row">
        <label className="f">
          <span>Source</span>
          <select name="source" defaultValue={r.source}>
            {pickable.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
                {s.archived ? " (retired)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Breakdown / document link</span>
          <input type="text" name="breakdown_link" defaultValue={r.breakdown_link} placeholder="https://…" />
        </label>
      </div>
      <label className="f">
        <span>Additional notes</span>
        <textarea name="notes" rows={2} defaultValue={r.notes} />
      </label>

      <h3 className="mr-group">Processing</h3>
      <div className="mr-form__row">
        <label className="f">
          <span>Assigned procurement</span>
          <select name="assigned_procurement" defaultValue={r.assigned_procurement ?? ""}>
            <option value="">Unassigned</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {ROLE_LABEL[p.role] ?? p.role}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Assigned sales</span>
          <select name="assigned_sales" defaultValue={r.assigned_sales ?? ""}>
            <option value="">Unassigned</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {ROLE_LABEL[p.role] ?? p.role}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="f">
        <span>Next action</span>
        <input type="text" name="next_action" defaultValue={r.next_action} placeholder="Awaiting specification" />
      </label>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

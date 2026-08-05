"use client";

import { useActionState, useState } from "react";
import {
  setStatusAction,
  updateSubadminAction,
  deleteSubadminAction,
} from "../../actions/team";
import type { FormState } from "../../actions/auth";
import type { TeamMember } from "@/lib/queries";

export default function TeamRow({ u, meId }: { u: TeamMember; meId: number }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editState, editAction, editPending] = useActionState<FormState, FormData>(
    updateSubadminAction,
    {}
  );
  const [delState, delAction, delPending] = useActionState<FormState, FormData>(
    deleteSubadminAction,
    {}
  );

  const isSelf = u.id === meId;
  const isAdmin = u.role === "admin";

  if (editing) {
    return (
      <tr>
        <td colSpan={7}>
          <form action={editAction} className="edit-row">
            <input type="hidden" name="id" value={u.id} />
            {editState.error && <div className="msg err">{editState.error}</div>}
            <div className="edit-grid">
              <label className="f">
                <span>Name</span>
                <input type="text" name="name" defaultValue={u.name} required />
              </label>
              <label className="f">
                <span>Email</span>
                <input type="email" name="email" defaultValue={u.email} required />
              </label>
              <label className="f">
                <span>Capacity</span>
                <input type="number" name="capacity" min={0} defaultValue={u.capacity} />
              </label>
            </div>
            <div className="row">
              <button className="btn" disabled={editPending}>
                {editPending ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td data-l="Name" style={{ color: "var(--ink)", fontWeight: 600 }}>
        {u.name || "—"}
        {isSelf && <span style={{ color: "var(--muted)", fontWeight: 400 }}> (you)</span>}
      </td>
      <td data-l="Email">{u.email}</td>
      <td data-l="Role">{isAdmin ? "Admin" : "Sub-admin"}</td>
      <td data-l="Status">
        <span className={`pill s-${u.status}`}>{cap(u.status)}</span>
      </td>
      <td data-l="Open">
        {Number(u.open_leads) || 0}
        {u.capacity > 0 && <span style={{ color: "var(--muted)" }}> / {u.capacity}</span>}
      </td>
      <td data-l="Last login">{u.last_login_at ? fmt(u.last_login_at) : "Never"}</td>
      <td data-l="">
        {delState.error && <div className="msg err">{delState.error}</div>}
        {delState.ok && <div className="msg ok">{delState.ok}</div>}

        {!isAdmin && !isSelf && !delState.ok && (
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" onClick={() => setEditing(true)}>
              Edit
            </button>

            <form action={setStatusAction}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="status" value={u.status === "disabled" ? "active" : "disabled"} />
              <button className={`btn sm ${u.status === "disabled" ? "ghost" : "danger"}`}>
                {u.status === "disabled" ? "Enable" : "Disable"}
              </button>
            </form>

            {confirming ? (
              <form action={delAction} className="row" style={{ gap: 6 }}>
                <input type="hidden" name="id" value={u.id} />
                <button className="btn danger sm" disabled={delPending}>
                  {delPending ? "Removing…" : "Confirm delete"}
                </button>
                <button type="button" className="btn ghost sm" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button className="btn danger sm" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
          </div>
        )}

        {confirming && (
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
            Their {Number(u.open_leads) || 0} open lead
            {Number(u.open_leads) === 1 ? "" : "s"} will be shared evenly among the other
            active sub-admins. Nothing is lost.
          </p>
        )}
      </td>
    </tr>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

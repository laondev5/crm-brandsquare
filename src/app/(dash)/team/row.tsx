"use client";

import { useActionState, useState } from "react";
import {
  setStatusAction,
  setRoleAction,
  updateSubadminAction,
  deleteSubadminAction,
} from "../../actions/team";
import type { FormState } from "../../actions/auth";
import type { TeamMember } from "@/lib/queries";
import { ROLES } from "@/lib/types";
import PermissionCheckboxes from "./permissions";

export default function TeamRow({
  u,
  meId,
  isSuper = false,
}: {
  u: TeamMember;
  meId: number;
  isSuper?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [rankErr, setRankErr] = useState("");
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
  const roleLabel = ROLES.find((r) => r.key === u.role)?.label ?? u.role;

  /*
   * Who this viewer may act on.
   *
   * An admin manages sub-admins only. A super admin manages anyone but
   * themselves — which is the point of the rank, and without it promoting
   * someone to admin quietly put them beyond editing or disabling.
   *
   * The plugin checks the same thing and additionally refuses to remove the
   * last super admin, so this decides what to draw, not what is allowed.
   */
  const canManage = !isSelf && (isSuper || u.role === "subadmin");

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
            </div>
            <div className="f">
              <span>What can they do?</span>
              <PermissionCheckboxes defaultChecked={u.permissions} />
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
      <td data-l="Role">
        {/* A super admin can promote or demote anyone but themselves. The
            plugin refuses to demote the last super admin, so the CRM cannot
            be left with nobody able to manage it. */}
        {isSuper && !isSelf ? (
          <form
            action={async (form) => {
              setRankErr("");
              const res = await setRoleAction(form);
              if (res?.error) setRankErr(res.error);
            }}
          >
            <input type="hidden" name="id" value={u.id} />
            <select
              name="role"
              defaultValue={u.role}
              aria-label={`Rank for ${u.name}`}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              style={{ width: "100%" }}
            >
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            {rankErr && (
              <small style={{ color: "var(--err)", display: "block", marginTop: 4 }}>
                {rankErr}
              </small>
            )}
          </form>
        ) : (
          roleLabel
        )}
      </td>
      <td data-l="Status">
        <span className={`pill s-${u.status}`}>{cap(u.status)}</span>
      </td>
      <td data-l="Open">{Number(u.open_leads) || 0}</td>
      <td data-l="Last login">{u.last_login_at ? fmt(u.last_login_at) : "Never"}</td>
      <td data-l="">
        {delState.error && <div className="msg err">{delState.error}</div>}
        {delState.ok && <div className="msg ok">{delState.ok}</div>}

        {canManage && !delState.ok && (
          <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
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

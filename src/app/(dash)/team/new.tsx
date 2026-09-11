"use client";

import { useActionState } from "react";
import { createSubadminAction } from "../../actions/team";
import type { FormState } from "../../actions/auth";
import { DESTRUCTIVE_PERMISSIONS, PERMISSIONS, ROLES } from "@/lib/types";
import PermissionCheckboxes from "./permissions";

export default function NewSubadmin({ isSuper = false }: { isSuper?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createSubadminAction, {});

  return (
    <form className="card" action={action}>
      <h2>{isSuper ? "Add a team member" : "Add a sub-admin"}</h2>

      {state.error && <div className="msg err">{state.error}</div>}
      {state.ok && <div className="msg ok">{state.ok}</div>}

      <label className="f">
        <span>Name</span>
        <input type="text" name="name" required placeholder="Chinedu Okafor" />
      </label>

      <label className="f">
        <span>Email</span>
        <input type="email" name="email" required placeholder="chinedu@brandsquare.shop" />
      </label>

      {/* Only a super admin sees this. An admin can create sub-admins and
          nothing else, so a rank picker would only offer them one option. */}
      {isSuper && (
        <label className="f">
          <span>Rank</span>
          <select name="role" defaultValue="subadmin">
            {ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label} — {r.note}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="f">
        <span>What can they do?</span>
        <PermissionCheckboxes
          defaultChecked={PERMISSIONS.map((p) => p.key).filter(
            (k) => !DESTRUCTIVE_PERMISSIONS.includes(k)
          )}
        />
      </div>

      <button className="btn" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "Creating…" : "Create and send invite"}
      </button>

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, marginBottom: 0 }}>
        They get an email with their address, a temporary password and a one-time link to set their
        own. The link expires in 48 hours. They only start receiving auto-assigned leads once
        they&rsquo;ve activated.
      </p>
    </form>
  );
}

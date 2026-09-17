"use client";

import { useActionState, useState } from "react";
import { createSubadminAction } from "../../actions/team";
import type { FormState } from "../../actions/auth";
import { DESTRUCTIVE_PERMISSIONS, PERMISSIONS, ROLES } from "@/lib/types";
import PermissionCheckboxes from "./permissions";

export default function NewSubadmin({ isSuper = false }: { isSuper?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createSubadminAction, {});
  const [role, setRole] = useState("subadmin");
  // An admin can add sub-admins and authors; a super admin can add any rank.
  const ranks = isSuper ? ROLES : ROLES.filter((r) => r.key === "subadmin" || r.key === "author");

  return (
    <form className="card" action={action}>
      <h2>Add a team member</h2>

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

      <label className="f">
          <span>Rank</span>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ranks.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label} — {r.note}
              </option>
            ))}
          </select>
        </label>

      {/* Permissions only narrow a sub-admin. Admins have everything, and an
          author works on the blog, which these do not touch. */}
      {role === "subadmin" && (
        <div className="f">
          <span>What can they do?</span>
          <PermissionCheckboxes
            defaultChecked={PERMISSIONS.map((p) => p.key).filter(
              (k) => !DESTRUCTIVE_PERMISSIONS.includes(k)
            )}
          />
        </div>
      )}
      {role === "author" && (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px" }}>
          Authors see only the blog — writing, publishing, categories and analytics — plus their own
          working day. They never see leads, the inbox or settings.
        </p>
      )}

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

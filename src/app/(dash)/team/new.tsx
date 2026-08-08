"use client";

import { useActionState } from "react";
import { createSubadminAction } from "../../actions/team";
import type { FormState } from "../../actions/auth";
import { PERMISSIONS } from "@/lib/types";
import PermissionCheckboxes from "./permissions";

export default function NewSubadmin() {
  const [state, action, pending] = useActionState<FormState, FormData>(createSubadminAction, {});

  return (
    <form className="card" action={action}>
      <h2>Add a sub-admin</h2>

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

      <div className="f">
        <span>What can they do?</span>
        <PermissionCheckboxes defaultChecked={PERMISSIONS.map((p) => p.key)} />
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

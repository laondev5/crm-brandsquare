"use client";

import { useActionState } from "react";
import { acceptInviteAction, type FormState } from "../../actions/auth";

export default function InviteForm({
  token,
  name,
  email,
}: {
  token: string;
  name: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(acceptInviteAction, {});

  return (
    <div className="auth-box">
      <h1>Welcome, {name}</h1>
      <p className="sub">
        Choose a password for <strong>{email}</strong>. The temporary one in your email stops working
        once you do.
      </p>

      {state.error && <div className="msg err">{state.error}</div>}

      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <label className="f">
          <span>New password</span>
          <input type="password" name="password" autoComplete="new-password" required autoFocus />
        </label>
        <label className="f">
          <span>Confirm password</span>
          <input type="password" name="password2" autoComplete="new-password" required />
        </label>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Set password"}
        </button>
      </form>
    </div>
  );
}

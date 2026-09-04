"use client";

import { useActionState } from "react";
import { addSiteAction, type AddSiteState } from "@/app/actions/sites";

/**
 * Adding a website hands back its key exactly once, because the server keeps
 * only a hash of it. So the success state is not a toast that disappears —
 * it is a panel that stays until it is dismissed, with the two values spelled
 * out in the order they get pasted.
 */
export default function AddSite() {
  const [state, action, pending] = useActionState<AddSiteState, FormData>(addSiteAction, {});

  if (state.created) {
    return (
      <div className="card">
        <h2>{state.created.name} is connected</h2>
        <div className="msg warn">
          Copy these now. The key is stored scrambled, so this is the only time it can be shown —
          if it is lost, remove the website and add it again.
        </div>

        <label className="f">
          <span>1. CRM address</span>
          <input type="text" readOnly value={state.created.hubUrl} onFocus={(e) => e.target.select()} />
        </label>

        <label className="f">
          <span>2. Website key</span>
          <input type="text" readOnly value={state.created.siteKey} onFocus={(e) => e.target.select()} />
        </label>

        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          On the new website: install the Brandsquare plugin, open{" "}
          <strong>Brandsquare → Settings</strong>, choose <strong>Send this site&rsquo;s leads to
          the CRM</strong>, and paste both values. Its enquiries will appear here from the next
          form submission.
        </p>

        <a className="btn" href="/sites">
          Done
        </a>
      </div>
    );
  }

  return (
    <form className="card" action={action}>
      <h2>Add a website</h2>

      {state.error && <div className="msg err">{state.error}</div>}

      <label className="f">
        <span>Name</span>
        <input type="text" name="name" required placeholder="Brandsquare Machines" />
      </label>

      <label className="f">
        <span>Address</span>
        <input type="url" name="url" placeholder="https://example.com" />
      </label>

      <button className="btn" disabled={pending}>
        {pending ? "Adding…" : "Add website"}
      </button>
    </form>
  );
}

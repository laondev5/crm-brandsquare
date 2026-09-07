"use client";

import { useActionState } from "react";
import { simulateWaInboundAction, type SimulateState } from "@/app/actions/whatsapp";

/**
 * A stand-in for a real customer message, so the inbox can be exercised end
 * to end before Meta has approved anything. The plugin itself refuses this
 * once a real number is connected, which is the actual safeguard — this form
 * simply stops being shown at that point, matching what would happen anyway.
 */
export default function SimulateForm() {
  const [state, action, pending] = useActionState<SimulateState, FormData>(simulateWaInboundAction, {});

  return (
    <div className="card">
      <h2>Test the inbox</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
        Fakes a message arriving from a customer, so the inbox, unread badges and replying can all
        be tried before a real WhatsApp number is connected. This disappears the moment one is.
      </p>

      {state.error && <div className="msg err">{state.error}</div>}
      {state.ok && <div className="msg ok">Sent — open the inbox to see it.</div>}

      <form action={action}>
        <label className="f">
          <span>Their phone number</span>
          <input type="text" name="phone" placeholder="e.g. 2348012345678" required />
        </label>
        <label className="f">
          <span>Their name (optional)</span>
          <input type="text" name="name" placeholder="Left blank if unknown" />
        </label>
        <label className="f">
          <span>Message</span>
          <textarea name="text" rows={2} placeholder="Hi, is this machine still available?" required />
        </label>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Sending…" : "Simulate incoming message"}
        </button>
      </form>
    </div>
  );
}

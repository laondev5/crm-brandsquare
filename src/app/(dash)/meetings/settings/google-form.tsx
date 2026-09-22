"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectGoogleAction, saveGoogleAction, testGoogleAction } from "@/app/actions/google";
import type { GoogleSettings } from "@/lib/types";

export default function GoogleForm({ settings }: { settings: GoogleSettings }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveGoogleAction, {});
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [busy, start] = useTransition();

  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => {
      setMsg(await fn());
      router.refresh();
    });

  return (
    <div className="card">
      <h2>Google Cloud credentials</h2>
      <form action={action}>
        {state.error && <div className="msg err">{state.error}</div>}
        {state.ok && <div className="msg ok">{state.ok}</div>}
        <label className="f">
          <span>Client ID</span>
          <input type="text" name="client_id" defaultValue={settings.client_id} placeholder="1234567890-abc.apps.googleusercontent.com" required />
        </label>
        <label className="f">
          <span>Client secret</span>
          <input
            type="password"
            name="client_secret"
            autoComplete="off"
            placeholder={settings.has_secret ? "•••••••••••• (saved — leave blank to keep it)" : "GOCSPX-…"}
          />
        </label>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      <div style={{ borderTop: "1px solid var(--line)", marginTop: 16, paddingTop: 16 }}>
        {msg.error && <div className="msg err">{msg.error}</div>}
        {msg.ok && <div className="msg ok">{msg.ok}</div>}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {settings.client_id && settings.has_secret && (
            // A plain link: the route redirects to Google, which a server action cannot do mid-form.
            <a href="/api/google/connect" className={`btn${settings.connected ? " ghost" : ""}`}>
              {settings.connected ? "Reconnect Google account" : "Connect Google account"}
            </a>
          )}
          {settings.connected && (
            <>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => run(testGoogleAction)}>
                {busy ? "Checking…" : "Test connection"}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                style={{ color: "var(--err)" }}
                onClick={() => {
                  if (confirm("Disconnect the Google account? New meetings will need a pasted Meet link.")) run(disconnectGoogleAction);
                }}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

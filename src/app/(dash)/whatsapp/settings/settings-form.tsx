"use client";

import { useActionState, useState, useTransition } from "react";
import { saveWaSettingsAction, verifyWaSettingsAction, type WaSettingsState } from "@/app/actions/whatsapp";
import type { WaSettings } from "@/lib/types";

export default function SettingsForm({ settings }: { settings: WaSettings }) {
  const [state, action, pending] = useActionState<WaSettingsState, FormData>(saveWaSettingsAction, {});
  const [verify, setVerify] = useState<{ ok: true; label: string } | { error: string } | null>(null);
  const [verifying, startVerify] = useTransition();

  return (
    <div className="card">
      <h2>Meta WhatsApp Business connection</h2>

      {state.error && <div className="msg err">{state.error}</div>}
      {state.ok && <div className="msg ok">Saved.</div>}

      {settings.configured ? (
        <div className="msg ok" style={{ marginBottom: 18 }}>
          Connected{settings.display_phone ? ` — ${settings.display_phone}` : ""}. Messages sent
          from the inbox go out for real.
        </div>
      ) : (
        <div className="msg warn" style={{ marginBottom: 18 }}>
          Not connected yet. The inbox works in test mode until a phone number ID and access token
          are saved here.
        </div>
      )}

      <form action={action}>
        <label className="f">
          <span>Phone number ID</span>
          <input type="text" name="phone_number_id" defaultValue={settings.phone_number_id} placeholder="From Meta's App Dashboard" />
        </label>

        <label className="f">
          <span>WhatsApp Business Account ID</span>
          <input type="text" name="waba_id" defaultValue={settings.waba_id} placeholder="Optional, for template sync later" />
        </label>

        <label className="f">
          <span>Access token</span>
          <input
            type="password"
            name="access_token"
            placeholder={settings.has_access_token ? "•••••••••••• (saved — leave blank to keep it)" : "Permanent access token"}
            autoComplete="off"
          />
        </label>

        <label className="f">
          <span>App secret</span>
          <input
            type="password"
            name="app_secret"
            placeholder={settings.has_app_secret ? "•••••••••••• (saved — leave blank to keep it)" : "Used to verify Meta's webhook calls"}
            autoComplete="off"
          />
        </label>

        <label className="f">
          <span>Webhook verify token</span>
          <input
            type="text"
            name="verify_token"
            defaultValue={settings.verify_token}
            placeholder="A phrase you invent, entered again in Meta's dashboard"
          />
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={verifying || !settings.configured}
            onClick={() =>
              startVerify(async () => {
                setVerify(null);
                setVerify(await verifyWaSettingsAction());
              })
            }
          >
            {verifying ? "Checking…" : "Verify connection"}
          </button>
        </div>

        {verify && "ok" in verify && (
          <p style={{ marginTop: 10, fontSize: 13, color: "#0f6e56" }}>Connected: {verify.label}</p>
        )}
        {verify && "error" in verify && (
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--err)" }}>{verify.error}</p>
        )}
      </form>
    </div>
  );
}

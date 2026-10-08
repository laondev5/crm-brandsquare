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

  // Which account to connect, and whether it should also open its mailbox.
  // Defaults to yes for the mailbox: the inbox is the reason most people come
  // back to this page, and a connection without it has to be redone to gain it.
  const [hint, setHint] = useState("");
  const [mail, setMail] = useState(true);

  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => {
      setMsg(await fn());
      router.refresh();
    });

  const wanted = hint.trim();
  const href = `/api/google/connect?${new URLSearchParams({
    ...(mail ? { mail: "1" } : {}),
    ...(wanted ? { hint: wanted } : {}),
  })}`;

  const current = settings.account_email.toLowerCase();
  // Choosing the account already connected is a refresh, not a switch.
  const isSwitch = settings.connected && (!wanted || wanted.toLowerCase() !== current);

  const confirmSwitch = (e: React.MouseEvent) => {
    if (!isSwitch) return;
    const meetings =
      "• Meetings already booked stay on " +
      (settings.account_email || "the old account") +
      "'s calendar. The CRM can no longer change or cancel those on Google, though they stay listed here. New meetings are created on the new account.\n";
    const ok = confirm(
      `Switch the connection to another Google account?\n\n` +
        `• ${settings.account_email || "The current account"} is disconnected, and the CRM's access to it is revoked.\n` +
        `• Email imported from it is removed from the CRM (nothing in Gmail itself is touched) and the new account's mail is imported instead.\n` +
        meetings +
        `\nContinue to Google?`
    );
    if (!ok) e.preventDefault();
  };

  const ready = !!(settings.client_id && settings.has_secret);

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

        {ready ? (
          <>
            <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>
              {settings.connected ? "Change the Google account" : "Connect a Google account"}
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
              Use the organisation&rsquo;s own account, so meetings and email belong to the company rather than to one
              person. Google will show an account chooser; type the address here to have it ready.
            </p>

            <label className="f">
              <span>Organisation&rsquo;s Google address</span>
              <input
                type="email"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="meetings@brandsquare.shop"
                autoComplete="off"
              />
            </label>

            <label className="qt-pick" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={mail} onChange={(e) => setMail(e.target.checked)} />
              <span>
                <strong>Also connect its email inbox</strong>
                <small>
                  Lets the CRM read this mailbox and send from it, for the Email inbox page. Google will ask for this
                  permission separately.
                </small>
              </span>
            </label>

            {settings.connected && mail && !settings.has_gmail && (
              <div className="msg warn">
                The connected account has not given the CRM access to its email yet. Connect again with the box ticked.
              </div>
            )}

            {/* A plain link: the route redirects to Google, which a server action cannot do mid-form. */}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <a href={href} onClick={confirmSwitch} className={`btn${settings.connected ? " ghost" : ""}`}>
                {!settings.connected ? "Connect Google account" : isSwitch ? "Change account" : "Reconnect this account"}
              </a>
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
                      if (
                        confirm(
                          "Disconnect the Google account?\n\nNew meetings will need a pasted Meet link, and the email inbox stops updating. Email already imported stays until the account is changed or removed."
                        )
                      )
                        run(disconnectGoogleAction);
                    }}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
            Save the Client ID and secret above, then a Connect button appears here.
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveMailSettingsAction, syncMailAction, wipeMailAction } from "@/app/actions/mail";
import type { MailSettings } from "@/lib/types";

const WINDOWS = [
  { days: 7, label: "the last week" },
  { days: 30, label: "the last 30 days" },
  { days: 90, label: "the last 3 months" },
  { days: 180, label: "the last 6 months" },
  { days: 365, label: "the last year" },
];

/**
 * How the email inbox behaves: how far back it reaches, who may open it, and
 * what a message sent from it looks like. Separate from the connection above,
 * which is only about who the CRM signs in as.
 */
export default function MailSettingsCard({ settings }: { settings: MailSettings }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveMailSettingsAction, {});
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [busy, start] = useTransition();

  return (
    <div className="card">
      <h2>Email inbox</h2>

      {!settings.has_gmail ? (
        <div className="msg warn" style={{ margin: 0 }}>
          Not connected. Connect the Google account with <strong>&ldquo;Also connect its email inbox&rdquo;</strong>{" "}
          ticked and the inbox appears under Leads → Email inbox.
        </div>
      ) : (
        <div className={`msg ${settings.last_error ? "err" : "ok"}`} style={{ marginTop: 0 }}>
          {settings.last_error ? (
            <>Last problem: {settings.last_error}</>
          ) : settings.importing ? (
            <>
              Importing <strong>{settings.mail_account || settings.account}</strong> &mdash;{" "}
              {settings.imported.toLocaleString()} messages so far. It carries on by itself.
            </>
          ) : (
            <>
              Reading <strong>{settings.mail_account || settings.account}</strong> &mdash;{" "}
              {settings.messages.toLocaleString()} messages in {settings.threads.toLocaleString()} conversations.{" "}
              <Link href="/mail" style={{ fontWeight: 600 }}>
                Open the inbox
              </Link>
            </>
          )}
        </div>
      )}

      {settings.has_gmail && (
        <>
          <form action={action} style={{ marginTop: 14 }}>
            {state.error && <div className="msg err">{state.error}</div>}
            {state.ok && <div className="msg ok">{state.ok}</div>}

            <label className="f">
              <span>Bring in mail from</span>
              <select name="sync_days" defaultValue={String(settings.sync_days)}>
                {WINDOWS.map((w) => (
                  <option key={w.days} value={w.days}>
                    {w.label}
                  </option>
                ))}
              </select>
              <small style={{ color: "var(--muted)" }}>
                Older mail stays in Gmail. Choosing a longer time fetches the extra on the next sync.
              </small>
            </label>

            <label className="f">
              <span>Who can open the inbox</span>
              <select name="visibility" defaultValue={settings.visibility}>
                <option value="everyone">Everyone allowed to send email</option>
                <option value="admins">Admins only</option>
              </select>
              <small style={{ color: "var(--muted)" }}>
                It is a whole mailbox, personal messages included. Limit it to admins if that mailbox is not just for
                customers.
              </small>
            </label>

            <label className="f">
              <span>Name on outgoing mail</span>
              <input type="text" name="from_name" defaultValue={settings.from_name} placeholder="Brandsquare" />
            </label>

            <label className="f">
              <span>Sign-off</span>
              <textarea
                name="signature"
                rows={3}
                defaultValue={settings.signature}
                placeholder={"Kind regards,\n{{your_name}}\nBrandsquare"}
              />
              <small style={{ color: "var(--muted)" }}>
                Added under every message sent from the inbox. <code>{"{{your_name}}"}</code> becomes the sender.
              </small>
            </label>

            <button className="btn" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--line)", marginTop: 16, paddingTop: 16 }}>
            {msg.error && <div className="msg err">{msg.error}</div>}
            {msg.ok && <div className="msg ok">{msg.ok}</div>}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const res = await syncMailAction();
                    setMsg("error" in res ? { error: res.error } : { ok: "Checked Gmail." });
                    router.refresh();
                  })
                }
              >
                {busy ? "Working…" : "Sync now"}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                style={{ color: "var(--err)" }}
                onClick={() => {
                  if (
                    confirm(
                      "Remove the imported email from the CRM?\n\nNothing in Gmail is touched. The mail is fetched again from Gmail on the next sync; anything sent from the CRM keeps its record in Gmail only."
                    )
                  )
                    start(async () => {
                      setMsg(await wipeMailAction());
                      router.refresh();
                    });
                }}
              >
                Remove imported mail
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveEmailSettingsAction } from "../../../actions/email";
import type { FormState } from "../../../actions/auth";
import type { EmailSettings } from "@/lib/types";

export default function SenderForm({ settings }: { settings: EmailSettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEmailSettingsAction, {});
  const [smtp, setSmtp] = useState(!!settings.smtp_enabled);

  return (
    <form action={action}>
      <div className="head">
        <h1>Sender settings</h1>
        <div className="spacer" />
        <Link href="/email" className="btn ghost">
          Back to email
        </Link>
      </div>

      {state.error && <div className="msg err">{state.error}</div>}
      {state.ok && <div className="msg ok">{state.ok}</div>}

      <div className="grid2">
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <h2>From address</h2>
            <div className="two">
              <label className="f">
                <span>Sender name</span>
                <input type="text" name="from_name" defaultValue={settings.from_name} />
              </label>
              <label className="f">
                <span>Sender email</span>
                <input type="email" name="from_email" defaultValue={settings.from_email} required />
              </label>
            </div>
            <label className="f">
              <span>Reply-to (optional)</span>
              <input type="email" name="reply_to" defaultValue={settings.reply_to} placeholder="Leave empty to use the sender address" />
            </label>
          </div>

          <div className="card">
            <h2>Delivery</h2>
            <label className="chooser" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                name="smtp_enabled"
                checked={smtp}
                onChange={(e) => setSmtp(e.target.checked)}
              />
              <span>
                <strong>Send through SMTP</strong>
                <small>
                  Off means WordPress uses the server&rsquo;s own mail. Turn this on to
                  authenticate as the mailbox, which usually improves deliverability.
                </small>
              </span>
            </label>

            {smtp && (
              <>
                <div className="two">
                  <label className="f">
                    <span>SMTP host</span>
                    <input type="text" name="smtp_host" defaultValue={settings.smtp_host} placeholder="smtp.hostinger.com" />
                  </label>
                  <label className="f">
                    <span>Port</span>
                    <input type="number" name="smtp_port" defaultValue={settings.smtp_port} />
                  </label>
                </div>
                <div className="two">
                  <label className="f">
                    <span>Encryption</span>
                    <select name="smtp_secure" defaultValue={settings.smtp_secure}>
                      <option value="tls">STARTTLS (port 587)</option>
                      <option value="ssl">SSL (port 465)</option>
                      <option value="">None</option>
                    </select>
                  </label>
                  <label className="f">
                    <span>Username</span>
                    <input type="text" name="smtp_user" defaultValue={settings.smtp_user} />
                  </label>
                </div>
                <label className="f">
                  <span>Password</span>
                  <input
                    type="password"
                    name="smtp_pass"
                    defaultValue={settings.smtp_pass}
                    placeholder="Leave unchanged to keep the current password"
                    autoComplete="new-password"
                  />
                </label>
              </>
            )}

            <label className="f">
              <span>Emails per batch</span>
              <input type="number" name="batch_size" min={1} max={100} defaultValue={settings.batch_size} />
              <small style={{ color: "var(--muted)", fontSize: 12 }}>
                Sent every couple of minutes. Keep it modest — shared hosts cap how many messages
                you may send per hour, and exceeding it gets sending suspended rather than queued.
              </small>
            </label>
          </div>

          <p>
            <button className="btn" disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </button>
          </p>
        </div>

        <div className="card">
          <h2>Before you send in bulk</h2>
          <p style={{ marginTop: 0 }}>
            The sender address should belong to your own domain. Sending as a Gmail or Yahoo
            address while claiming to be Brandsquare is the fastest route to the spam folder,
            because the message fails the checks receivers run against your domain.
          </p>
          <p>
            If mail lands in spam, the fix is almost always DNS rather than anything here —
            an <strong>SPF</strong> record listing your sending host, and <strong>DKIM</strong>{" "}
            enabled on the mailbox. Both are set at Hostinger.
          </p>
          <p style={{ marginBottom: 0 }}>
            Send yourself a test first. Create a lead with your own address through one of your
            forms, then email that campaign only.
          </p>
        </div>
      </div>
    </form>
  );
}

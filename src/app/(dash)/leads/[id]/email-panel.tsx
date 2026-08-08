"use client";

import { useActionState, useState } from "react";
import { sendLeadEmailAction, type LeadEmailState } from "../../../actions/leads";
import type { EmailBlocks, LeadEmail } from "@/lib/types";

export default function EmailPanel({
  leadId,
  leadEmail,
  unsubscribed,
  history,
  defaults,
  fromLabel,
  canSend,
}: {
  leadId: number;
  leadEmail: string;
  unsubscribed: boolean;
  history: LeadEmail[];
  defaults: EmailBlocks;
  fromLabel: string;
  canSend: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<LeadEmailState, FormData>(sendLeadEmailAction, {});

  return (
    <div className="card">
      <h2>Email</h2>

      {!leadEmail ? (
        <p className="empty" style={{ padding: "14px 0" }}>
          No email address on file for this lead.
        </p>
      ) : unsubscribed ? (
        <div className="msg err">
          This lead unsubscribed from email — sending to them is disabled.
        </div>
      ) : !canSend ? (
        history.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            You don&rsquo;t have permission to send email.
          </p>
        )
      ) : (
        <>
          {!open && (
            <button className="btn" onClick={() => setOpen(true)}>
              Send email
            </button>
          )}

          {open && (
            <form action={action} style={{ marginTop: 10 }}>
              <input type="hidden" name="lead_id" value={leadId} />
              <input type="hidden" name="header_text" value={defaults.header_text} />
              <input type="hidden" name="header_bg" value={defaults.header_bg} />
              <input type="hidden" name="header_color" value={defaults.header_color} />
              <input type="hidden" name="body_bg" value={defaults.body_bg} />
              <input type="hidden" name="body_color" value={defaults.body_color} />
              <input type="hidden" name="accent" value={defaults.accent} />
              <input type="hidden" name="footer_text" value={defaults.footer_text} />
              <input type="hidden" name="footer_bg" value={defaults.footer_bg} />
              <input type="hidden" name="footer_color" value={defaults.footer_color} />

              {state.error && <div className="msg err">{state.error}</div>}

              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px" }}>
                To <strong>{leadEmail}</strong>, from {fromLabel}
              </p>

              <label className="f">
                <span>Subject</span>
                <input type="text" name="subject" required autoFocus />
              </label>
              <label className="f">
                <span>Message</span>
                <textarea name="body_html" rows={6} required />
              </label>

              <div className="row">
                <button className="btn" disabled={pending}>
                  {pending ? "Sending…" : "Send"}
                </button>
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {state.ok && <div className="msg ok" style={{ marginTop: 12 }}>{state.ok}</div>}

      {history.length > 0 && (
        <>
          <h2 style={{ marginTop: 20 }}>Sent before</h2>
          <ul className="tl">
            {history.map((e) => (
              <li key={e.id}>
                <b>{e.subject}</b>
                <span
                  className={`pill ${e.status === "sent" ? "s-won" : e.status === "failed" ? "s-lost" : "s-new"}`}
                  style={{ marginLeft: 8 }}
                >
                  {e.status}
                </span>
                <small>
                  {e.sent_by || "—"} · {e.sent_at ? fmt(e.sent_at) : "not sent yet"}
                </small>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

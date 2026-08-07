"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sendCampaignAction, type SendState } from "../../../actions/email";
import type { EmailBlocks } from "@/lib/types";

export default function Composer({
  blocks,
  fromEmail,
  fromName,
  allCount,
  sample,
  campaigns,
  isAdmin,
}: {
  blocks: EmailBlocks;
  fromEmail: string;
  fromName: string;
  allCount: number;
  sample: { name: string; email: string }[];
  campaigns: { id: number; name: string; count: number }[];
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendCampaignAction, {});
  const [b, setB] = useState<EmailBlocks>(blocks);
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState<"all" | "form">("all");
  const [formId, setFormId] = useState<number | "">("");
  const [confirm, setConfirm] = useState(false);

  const set = (k: keyof EmailBlocks) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setB({ ...b, [k]: e.target.value });

  const reach =
    audience === "all" ? allCount : campaigns.find((c) => c.id === formId)?.count ?? 0;

  // Merge tags are resolved on the server at send time; show a plausible
  // substitution so the preview reads like the real thing.
  const preview = b.body_html
    .replace(/\{\{name\}\}/g, sample[0]?.name || "Chinedu Okafor")
    .replace(/\{\{first\}\}/g, (sample[0]?.name || "Chinedu").split(" ")[0])
    .replace(/\{\{email\}\}/g, sample[0]?.email || "someone@example.com");

  if (state.ok) {
    return (
      <>
        <div className="head">
          <h1>Email queued</h1>
        </div>
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="msg ok">{state.ok}</div>
          <p style={{ marginTop: 0 }}>
            Sending runs on the WordPress server in batches, so it continues whether or not this
            page stays open.
          </p>
          <div className="row">
            {state.campaignId && (
              <Link href={`/email/${state.campaignId}`} className="btn">
                View progress
              </Link>
            )}
            <Link href="/email" className="btn ghost">
              All emails
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <form action={action}>
      <div className="head">
        <h1>New email</h1>
        <div className="spacer" />
        <Link href="/email" className="btn ghost">
          Cancel
        </Link>
      </div>

      {state.error && <div className="msg err">{state.error}</div>}

      <div className="grid2">
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <h2>Who it goes to</h2>

            <label className="chooser">
              <input
                type="radio"
                name="audience_type"
                value="all"
                checked={audience === "all"}
                onChange={() => setAudience("all")}
              />
              <span>
                <strong>{isAdmin ? "All leads" : "All my leads"}</strong>
                <small>{allCount} reachable</small>
              </span>
            </label>

            <label className="chooser">
              <input
                type="radio"
                name="audience_type"
                value="form"
                checked={audience === "form"}
                onChange={() => setAudience("form")}
              />
              <span>
                <strong>One campaign form</strong>
                <small>Only people who filled a specific form</small>
              </span>
            </label>

            {audience === "form" && (
              <select
                name="form_id"
                value={formId}
                onChange={(e) => setFormId(Number(e.target.value) || "")}
                style={{ marginTop: 6 }}
              >
                <option value="">Choose a campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.count} reachable
                  </option>
                ))}
              </select>
            )}
            {audience === "all" && <input type="hidden" name="form_id" value="" />}

            <p className="reach">
              This will send to <strong>{reach}</strong> {reach === 1 ? "person" : "people"}.
              <br />
              <small>
                Anyone unsubscribed or without an email address is already excluded, and repeat
                enquirers are counted once.
              </small>
            </p>
          </div>

          <div className="card">
            <h2>Message</h2>
            <label className="f">
              <span>Subject</span>
              <input
                type="text"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="New machinery stock arriving this month"
                required
              />
            </label>

            <label className="f">
              <span>Header text</span>
              <input type="text" name="header_text" value={b.header_text} onChange={set("header_text")} />
            </label>

            <label className="f">
              <span>Body</span>
              <textarea
                name="body_html"
                value={b.body_html}
                onChange={set("body_html")}
                rows={9}
                required
              />
              <small style={{ color: "var(--muted)", fontSize: 12 }}>
                Use <code>{"{{name}}"}</code>, <code>{"{{first}}"}</code> or{" "}
                <code>{"{{email}}"}</code> and each person gets their own details.
              </small>
            </label>

            <div className="two">
              <label className="f">
                <span>Button label (optional)</span>
                <input type="text" name="cta_label" value={b.cta_label} onChange={set("cta_label")} />
              </label>
              <label className="f">
                <span>Button link</span>
                <input type="url" name="cta_url" value={b.cta_url} onChange={set("cta_url")} placeholder="https://" />
              </label>
            </div>

            <label className="f">
              <span>Footer</span>
              <textarea name="footer_text" value={b.footer_text} onChange={set("footer_text")} rows={3} />
              <small style={{ color: "var(--muted)", fontSize: 12 }}>
                An unsubscribe link is added below this automatically. It cannot be removed.
              </small>
            </label>
          </div>

          <div className="card">
            <h2>Colours</h2>
            <div className="swatches">
              {(
                [
                  ["header_bg", "Header background"],
                  ["header_color", "Header text"],
                  ["body_bg", "Body background"],
                  ["body_color", "Body text"],
                  ["accent", "Button"],
                  ["footer_bg", "Footer background"],
                  ["footer_color", "Footer text"],
                ] as [keyof EmailBlocks, string][]
              ).map(([k, label]) => (
                <label key={k}>
                  <span>{label}</span>
                  <input type="color" name={k} value={b[k] as string} onChange={set(k)} />
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Send</h2>
            <p style={{ marginTop: 0 }}>
              From <strong>{fromName}</strong> &lt;{fromEmail}&gt;
              {isAdmin && (
                <>
                  {" · "}
                  <Link href="/email/settings" style={{ color: "var(--p)", fontWeight: 600 }}>
                    change
                  </Link>
                </>
              )}
            </p>

            {!confirm ? (
              <button
                type="button"
                className="btn"
                onClick={() => setConfirm(true)}
                disabled={reach === 0 || !subject.trim()}
              >
                {reach === 0 ? "Nobody to send to" : `Send to ${reach}…`}
              </button>
            ) : (
              <>
                <div className="msg err" style={{ marginBottom: 12 }}>
                  This sends immediately to {reach} {reach === 1 ? "person" : "people"} and cannot
                  be recalled.
                </div>
                <div className="row">
                  <button className="btn" disabled={pending}>
                    {pending ? "Queueing…" : "Yes, send it"}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card preview-col">
          <h2>Preview</h2>
          <div className="mail-frame">
            <div className="mail-meta">
              <div>
                <strong>{fromName}</strong> &lt;{fromEmail}&gt;
              </div>
              <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 3 }}>
                {subject || "(no subject yet)"}
              </div>
            </div>
            <div className="mail-body" style={{ background: b.body_bg }}>
              <div
                style={{
                  background: b.header_bg,
                  color: b.header_color,
                  padding: "20px 24px",
                  fontWeight: 700,
                  fontSize: 17,
                }}
              >
                {b.header_text}
              </div>
              <div
                style={{
                  padding: "22px 24px 6px",
                  color: b.body_color,
                  fontSize: 14,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                }}
              >
                {preview}
              </div>
              {b.cta_label && b.cta_url && (
                <div style={{ padding: "12px 24px 22px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: b.accent,
                      color: "#fff",
                      fontWeight: 700,
                      padding: "11px 22px",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    {b.cta_label}
                  </span>
                </div>
              )}
              <div
                style={{
                  background: b.footer_bg,
                  color: b.footer_color,
                  padding: "16px 24px",
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {b.footer_text}
                <br />
                <br />
                <u>Unsubscribe</u>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>
            Merge tags are filled in per person when the email is sent.
          </p>
        </div>
      </div>
    </form>
  );
}

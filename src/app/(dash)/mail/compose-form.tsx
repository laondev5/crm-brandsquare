"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, X } from "lucide-react";
import { mailSendPassAction, sendMailAction } from "@/app/actions/mail";
import {
  MAIL_MAX_ATTACHMENT_BYTES,
  fillResponse,
  groupBySection,
  type KbItem,
  type MessageTemplate,
} from "@/lib/types";
import TemplatePicker from "../leads/[id]/template-picker";

function size(n: number) {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/**
 * One form for a reply and for a new message.
 *
 * A reply is a thread id and a box: who it goes to and the subject are already
 * known. A new message adds the address and subject fields. Either can carry
 * files, and that decides the route: with none, the message goes through the
 * dashboard like any other action; with some, the browser posts it straight to
 * WordPress with a signed pass, because the dashboard is on Vercel, which
 * refuses a request body over 4.5 MB.
 */
export default function ComposeForm({
  threadId = null,
  defaultTo = "",
  defaultSubject = "",
  templates = [],
  responses = [],
  meName = "",
  vars = {},
  autoFocus = false,
  onSent,
  onCancel,
}: {
  threadId?: number | null;
  defaultTo?: string;
  defaultSubject?: string;
  templates?: MessageTemplate[];
  responses?: KbItem[];
  meName?: string;
  vars?: { name?: string; email?: string; phone?: string; company?: string };
  autoFocus?: boolean;
  /** Called with the conversation the message ended up in. */
  onSent?: (threadId: number | null) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isReply = threadId !== null;
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [editTo, setEditTo] = useState(!isReply);
  const [subject, setSubject] = useState(defaultSubject);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const picker = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const total = files.reduce((n, f) => n + f.size, 0);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    const sum = next.reduce((n, f) => n + f.size, 0);
    if (sum > MAIL_MAX_ATTACHMENT_BYTES) {
      setError(`Attachments can be ${size(MAIL_MAX_ATTACHMENT_BYTES)} in all. These come to ${size(sum)}.`);
      return;
    }
    setError("");
    setFiles(next);
    if (picker.current) picker.current.value = "";
  }

  function send() {
    setError("");
    if (!text.trim() && files.length === 0) {
      setError("Write something first.");
      return;
    }
    if (!isReply && !to.trim()) {
      setError("Who is it for? Put an email address in To.");
      return;
    }

    start(async () => {
      let landed: number | null = threadId;

      if (files.length === 0) {
        const res = await sendMailAction({ threadId, to, cc, subject, text });
        if ("error" in res) {
          setError(res.error);
          return;
        }
        landed = res.threadId ?? threadId;
      } else {
        const pass = await mailSendPassAction();
        if ("error" in pass) {
          setError(pass.error);
          return;
        }
        const form = new FormData();
        form.append("ticket", pass.ticket);
        if (threadId) form.append("thread_id", String(threadId));
        form.append("to", to);
        form.append("cc", cc);
        form.append("subject", subject);
        form.append("text", text);
        for (const f of files) form.append("files[]", f, f.name);

        try {
          const r = await fetch(pass.url, { method: "POST", body: form });
          const body = await r.json().catch(() => null);
          if (!r.ok) {
            setError(body?.message || `The message was refused (HTTP ${r.status}).`);
            return;
          }
          landed = body?.thread_id ?? threadId;
        } catch {
          setError("Could not reach the website to send it. Nothing was sent.");
          return;
        }
      }

      setText("");
      setFiles([]);
      setCc("");
      router.refresh();
      onSent?.(landed);
    });
  }

  return (
    <div className="mail-compose">
      {error && (
        <div className="msg err" role="alert" style={{ marginBottom: 8 }}>
          {error}
        </div>
      )}

      {isReply && !editTo ? (
        <p className="mail-compose__to">
          To <strong>{to || "—"}</strong>{" "}
          <button type="button" className="mail-link" onClick={() => setEditTo(true)}>
            change
          </button>
        </p>
      ) : (
        <>
          <label className="mail-compose__row">
            <span>To</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@company.com, another@company.com"
              autoFocus={autoFocus && !isReply}
              autoComplete="off"
            />
            {!showCc && (
              <button type="button" className="mail-link" onClick={() => setShowCc(true)}>
                Cc
              </button>
            )}
          </label>
          {showCc && (
            <label className="mail-compose__row">
              <span>Cc</span>
              <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} autoComplete="off" />
            </label>
          )}
        </>
      )}

      {!isReply && (
        <label className="mail-compose__row">
          <span>Subject</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} autoComplete="off" />
        </label>
      )}

      {(templates.length > 0 || responses.length > 0) && (
        <div className="mail-compose__picks">
          <TemplatePicker
            templates={templates}
            vars={vars}
            onPick={(body, subj) => {
              setText(body);
              if (!isReply && subj) setSubject(subj);
              bodyRef.current?.focus();
            }}
          />
          {responses.length > 0 && (
            <select
              value=""
              aria-label="Use a response template"
              style={{ marginBottom: 8 }}
              onChange={(e) => {
                const r = responses.find((x) => String(x.id) === e.target.value);
                if (r) {
                  setText(fillResponse(r.body, { name: vars.name?.split(" ")[0], yourName: meName }));
                  bodyRef.current?.focus();
                }
              }}
            >
              <option value="">Use a response template…</option>
              {groupBySection(responses).map((g) => (
                <optgroup key={g.section} label={g.section}>
                  {g.items.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>
      )}

      <textarea
        ref={bodyRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={isReply ? 5 : 10}
        placeholder={isReply ? "Write a reply…" : "Write your message…"}
        autoFocus={autoFocus && isReply}
        style={{ width: "100%", resize: "vertical" }}
      />

      {files.length > 0 && (
        <ul className="mail-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <Paperclip className="size-3" aria-hidden="true" /> {f.name} <small>{size(f.size)}</small>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
          <li style={{ color: "var(--muted)" }}>
            <small>
              {size(total)} of {size(MAIL_MAX_ATTACHMENT_BYTES)}
            </small>
          </li>
        </ul>
      )}

      <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "center" }}>
        <button type="button" className="btn" onClick={send} disabled={busy}>
          <Send className="size-3" /> {busy ? "Sending…" : "Send"}
        </button>
        <input ref={picker} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        <button type="button" className="btn ghost" onClick={() => picker.current?.click()} disabled={busy}>
          <Paperclip className="size-3" /> Attach
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplateAction, saveTemplateAction } from "@/app/actions/templates";
import { WA_LEAD_FIELDS, fillTemplate, type MessageTemplate, type TemplateChannel } from "@/lib/types";

const SAMPLE = {
  name: "Amina Bello",
  first_name: "Amina",
  email: "amina@example.com",
  phone: "+234 803 000 0000",
  company: "Kano Agro Ltd",
};

const COPY: Record<TemplateChannel, { noun: string; body: string; placeholder: string }> = {
  email: {
    noun: "email template",
    body: "Message",
    placeholder:
      "Hello {{first_name}},\n\nThank you for your enquiry about our machines. I have attached the price list for {{company}}.\n\nKind regards",
  },
  note: {
    noun: "note",
    body: "Note",
    placeholder: "Called {{first_name}} — interested, wants a quote by Friday.",
  },
  whatsapp: {
    noun: "quick reply",
    body: "Message",
    placeholder: "Hi {{first_name}}, thanks for your message! Which machine are you interested in?",
  },
};

const flat = (s: string, n = 90) => {
  const f = s.replace(/\s+/g, " ").trim();
  return f.length > n ? f.slice(0, n) + "…" : f;
};

/**
 * Saved wording for one channel: the list on the left, the editor and a
 * preview on the right. Editing happens in place -- the old page could only
 * add and delete, so fixing a typo meant retyping the whole thing.
 */
export default function SnippetManager({
  channel,
  templates,
  fromLabel = "Brandsquare",
}: {
  channel: TemplateChannel;
  templates: MessageTemplate[];
  fromLabel?: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const c = COPY[channel];

  const load = (t: MessageTemplate | null, copy = false) => {
    setEditing(t && !copy ? t.id : null);
    setName(t ? (copy ? `${t.name} copy` : t.name) : "");
    setSubject(t?.subject ?? "");
    setBody(t?.body ?? "");
    setErr("");
    setOk("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const insert = (key: string) => {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    const s = el?.selectionStart ?? body.length;
    const e = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, s) + token + body.slice(e));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + token.length, s + token.length);
    });
  };

  const save = () => {
    setErr("");
    setOk("");
    start(async () => {
      const res = await saveTemplateAction({ id: editing ?? undefined, name, channel, subject, body });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setOk(editing ? "Changes saved." : "Saved.");
      if (!editing) {
        setName("");
        setSubject("");
        setBody("");
      }
      router.refresh();
    });
  };

  const remove = (t: MessageTemplate) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    setErr("");
    start(async () => {
      const res = await deleteTemplateAction(t.id);
      if ("error" in res) setErr(res.error);
      else {
        if (editing === t.id) load(null);
        router.refresh();
      }
    });
  };

  const needle = q.trim().toLowerCase();
  const shown = templates.filter(
    (t) => !needle || `${t.name} ${t.subject} ${t.body}`.toLowerCase().includes(needle)
  );
  const filledBody = fillTemplate(body, SAMPLE);
  const filledSubject = fillTemplate(subject, SAMPLE);

  return (
    <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}>
      <div className="card">
        <div className="row" style={{ gap: 8, marginBottom: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Saved ({templates.length})</h2>
          <div className="spacer" />
          {templates.length > 5 && (
            <input
              type="search"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 180 }}
              aria-label="Search templates"
            />
          )}
        </div>

        {shown.length === 0 ? (
          <p className="empty" style={{ padding: "8px 0" }}>
            {templates.length ? "Nothing matches that." : `No ${c.noun}s saved yet — write the first one on the right.`}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {shown.map((t) => (
              <div
                key={t.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  background: editing === t.id ? "var(--accent)" : "#fff",
                }}
              >
                <div className="row" style={{ gap: 6, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ fontSize: 13.5, color: "var(--ink)" }}>{t.name}</strong>
                    {channel === "email" && t.subject && (
                      <div style={{ fontSize: 12.5, color: "var(--txt)", marginTop: 1 }}>{t.subject}</div>
                    )}
                    <small style={{ display: "block", color: "var(--muted)", marginTop: 2 }}>{flat(t.body)}</small>
                  </div>
                  <button className="btn ghost sm" disabled={busy} onClick={() => load(t)}>
                    Edit
                  </button>
                  <button className="btn ghost sm" disabled={busy} onClick={() => load(t, true)}>
                    Copy
                  </button>
                  <button
                    className="btn danger sm"
                    disabled={busy}
                    onClick={() => remove(t)}
                    aria-label={`Delete ${t.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={formRef} style={{ display: "grid", gap: 16, alignSelf: "start", scrollMarginTop: 16 }}>
        <div className="card">
          <div className="row" style={{ alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>
              {editing ? `Editing “${templates.find((t) => t.id === editing)?.name ?? ""}”` : `New ${c.noun}`}
            </h2>
            <div className="spacer" />
            {editing && (
              <button className="btn ghost sm" onClick={() => load(null)}>
                Start a new one
              </button>
            )}
          </div>

          {err && <div className="msg err">{err}</div>}
          {ok && <div className="msg ok">{ok}</div>}

          <label className="f">
            <span>Name</span>
            <input
              type="text"
              value={name}
              maxLength={190}
              placeholder={channel === "email" ? "Price list follow-up" : channel === "note" ? "No answer" : "First reply"}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {channel === "email" && (
            <label className="f">
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                maxLength={190}
                placeholder="Your price list, {{first_name}}"
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
          )}

          <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{c.body}</span>
          <div className="row" style={{ gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
            {WA_LEAD_FIELDS.map((f) => (
              <button key={f.key} type="button" className="btn ghost sm" onClick={() => insert(f.key)}>
                + {f.label}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            rows={channel === "email" ? 9 : 6}
            value={body}
            placeholder={c.placeholder}
            onChange={(e) => setBody(e.target.value)}
            style={{ width: "100%" }}
          />
          <small style={{ display: "block", color: "var(--muted)", margin: "4px 0 12px" }}>
            Fields fill in from the lead when you use the template. If a lead has no company saved,
            the field is left as written so you can spot it.
          </small>

          <button
            className="btn"
            disabled={busy || !name.trim() || !body.trim()}
            onClick={save}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Save"}
          </button>
        </div>

        <div className="card">
          <h2>Preview</h2>
          {channel === "email" ? (
            <div className="mail-frame">
              <div className="mail-meta">
                <div>
                  <strong>{fromLabel}</strong> → amina@example.com
                </div>
                <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 3 }}>
                  {filledSubject || "(no subject yet)"}
                </div>
              </div>
              <div
                className="mail-body"
                style={{ padding: "18px 20px", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", background: "#fff" }}
              >
                {filledBody || <span style={{ color: "var(--muted)" }}>Your message will appear here.</span>}
              </div>
            </div>
          ) : channel === "whatsapp" ? (
            <div style={{ background: "#efeae2", borderRadius: 12, padding: 14 }}>
              <div
                style={{
                  background: "#d9fdd3",
                  borderRadius: 8,
                  padding: "8px 10px",
                  maxWidth: 280,
                  marginLeft: "auto",
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                  boxShadow: "0 1px 0.5px rgba(0,0,0,.13)",
                }}
              >
                {filledBody || <span style={{ color: "#667781" }}>Your message will appear here.</span>}
              </div>
            </div>
          ) : (
            <div
              style={{
                borderLeft: "3px solid var(--p)",
                background: "#fafafc",
                padding: "10px 12px",
                fontSize: 13.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {filledBody || <span style={{ color: "var(--muted)" }}>Your note will appear here.</span>}
            </div>
          )}
          <small style={{ display: "block", color: "var(--muted)", marginTop: 8 }}>
            Shown for a sample lead, Amina Bello of Kano Agro Ltd.
          </small>
        </div>
      </div>
    </div>
  );
}

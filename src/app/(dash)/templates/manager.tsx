"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplateAction, saveTemplateAction } from "@/app/actions/templates";
import type { MessageTemplate, TemplateChannel } from "@/lib/types";

const CHANNELS: { key: TemplateChannel; label: string }[] = [
  { key: "note", label: "Note" },
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
];

export default function TemplateManager({ initial }: { initial: MessageTemplate[] }) {
  const router = useRouter();
  const [channel, setChannel] = useState<TemplateChannel>("note");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, startTransition] = useTransition();

  const save = () => {
    setErr("");
    setOk("");
    startTransition(async () => {
      const res = await saveTemplateAction({ name, channel, subject, body });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setName("");
      setSubject("");
      setBody("");
      setOk("Template saved.");
      router.refresh();
    });
  };

  const remove = (t: MessageTemplate) => {
    if (!confirm(`Remove the template "${t.name}"?`)) return;
    setErr("");
    setOk("");
    startTransition(async () => {
      const res = await deleteTemplateAction(t.id);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="grid2">
      <div style={{ display: "grid", gap: 20 }}>
        {CHANNELS.map((c) => {
          const rows = initial.filter((t) => t.channel === c.key);
          return (
            <div className="card" key={c.key}>
              <h2>{c.label}</h2>
              {rows.length === 0 ? (
                <p className="empty" style={{ padding: "8px 0" }}>
                  Nothing saved for {c.label.toLowerCase()} yet.
                </p>
              ) : (
                <ul className="filelist">
                  {rows.map((t) => (
                    <li key={t.id}>
                      <span className="name">{t.name}</span>
                      <small>
                        {t.channel === "email" && t.subject ? `${t.subject} · ` : ""}
                        {preview(t.body)}
                      </small>
                      <button
                        className="btn ghost sm"
                        disabled={busy}
                        onClick={() => remove(t)}
                        aria-label={`Remove ${t.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ alignSelf: "start" }}>
        <h2>New template</h2>

        {err && <div className="msg err">{err}</div>}
        {ok && <div className="msg ok">{ok}</div>}

        <label className="f">
          <span>Used for</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value as TemplateChannel)}>
            {CHANNELS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="f">
          <span>Name</span>
          <input
            type="text"
            value={name}
            maxLength={190}
            placeholder="First reply"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {/* Only email has a subject; showing the field on the others would
            invite people to fill in something that is never sent. */}
        {channel === "email" && (
          <label className="f">
            <span>Subject</span>
            <input
              type="text"
              value={subject}
              maxLength={190}
              placeholder="Your enquiry about {{company}}"
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
        )}

        <label className="f">
          <span>Message</span>
          <textarea
            rows={8}
            value={body}
            placeholder={"Hello {{name}},\n\nThanks for getting in touch…"}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
          <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{phone}}"}</code> and{" "}
          <code>{"{{company}}"}</code> are filled in from the lead when you pick the template.
          Anything left blank on the lead stays as written, so nothing turns into an empty gap
          mid-sentence.
        </p>

        <button
          className="btn"
          disabled={busy || !name.trim() || !body.trim()}
          onClick={save}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {busy ? "Saving…" : "Save template"}
        </button>
      </div>
    </div>
  );
}

function preview(body: string) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 70 ? flat.slice(0, 70) + "…" : flat;
}

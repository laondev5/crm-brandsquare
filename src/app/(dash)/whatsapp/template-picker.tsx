"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";
import { sendWaTemplateAction } from "@/app/actions/wa-templates";
import { WA_LEAD_FIELDS, type WaTemplate } from "@/lib/types";
import TemplatePreview from "./templates/template-preview";

type Contact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
};

function contactValue(c: Contact | null | undefined, key: string) {
  if (!c) return "";
  if (key === "first_name") return (c.name ?? "").trim().split(/\s+/)[0] ?? "";
  const v = (c as Record<string, string | null | undefined>)[key];
  return (v ?? "").trim();
}

/**
 * Picks an approved template, fills its fields and sends it -- from a
 * conversation, or from a lead with no conversation yet. Fields the lead
 * already answers are filled in and can be changed; anything else has to be
 * typed, and Send waits until it is.
 */
export default function TemplatePicker({
  templates,
  to,
  contact,
  label = "Template",
  buttonClass = "btn ghost",
}: {
  templates: WaTemplate[];
  to: { conversation_id?: number; lead_id?: number };
  contact?: Contact | null;
  label?: string;
  buttonClass?: string;
}) {
  const router = useRouter();
  const approved = templates.filter((t) => t.status === "APPROVED");
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [sentTo, setSentTo] = useState<number | null>(null);
  const [busy, start] = useTransition();
  const chosen = approved.find((t) => t.id === id) ?? null;

  const pick = (t: WaTemplate) => {
    setId(t.id);
    setErr("");
    setValues(Object.fromEntries(t.variables.map((v) => [v.key, contactValue(contact, v.key)])));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const show = () => {
    setOpen(true);
    setSentTo(null);
    setErr("");
    if (!chosen && approved[0]) pick(approved[0]);
  };

  const isLead = (k: string) => WA_LEAD_FIELDS.some((f) => f.key === k);
  const missing = chosen?.variables.filter((v) => !isLead(v.key) && !values[v.key]?.trim()) ?? [];

  const send = () => {
    if (!chosen) return;
    setErr("");
    start(async () => {
      const res = await sendWaTemplateAction(chosen.id, to, values);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      router.refresh();
      if (to.conversation_id) setOpen(false);
      else setSentTo(res.conversationId);
    });
  };

  return (
    <>
      <button type="button" className={buttonClass} onClick={show}>
        <FileText className="size-3.5" aria-hidden="true" style={{ marginRight: 4 }} />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send a WhatsApp template"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,15,25,.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{ width: "min(820px, 100%)", maxHeight: "90vh", overflow: "auto", padding: 0 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h2 style={{ margin: 0 }}>Send a template</h2>
              <div className="spacer" />
              <button type="button" className="btn ghost sm" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-3.5" />
              </button>
            </div>

            {sentTo ? (
              <div style={{ padding: 24 }}>
                <div className="msg ok">Sent. It is in the WhatsApp inbox with the rest of the conversation.</div>
                <Link href={`/whatsapp?c=${sentTo}`} className="btn">
                  Open the conversation
                </Link>
              </div>
            ) : approved.length === 0 ? (
              <div style={{ padding: 24 }}>
                <p className="empty" style={{ padding: 0 }}>
                  No approved templates yet.
                </p>
                <Link href="/templates/whatsapp" className="btn ghost sm" style={{ marginTop: 10 }}>
                  Go to templates
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", minHeight: 360 }}>
                <div style={{ borderRight: "1px solid var(--line)", overflowY: "auto" }}>
                  {approved.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pick(t)}
                      aria-pressed={t.id === id}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        border: 0,
                        borderBottom: "1px solid var(--line)",
                        padding: "10px 14px",
                        cursor: "pointer",
                        background: t.id === id ? "var(--accent)" : "#fff",
                      }}
                    >
                      <strong style={{ fontSize: 13, color: "var(--ink)" }}>{t.label}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>
                        {t.body.replace(/\s+/g, " ").slice(0, 60)}
                        {t.body.length > 60 ? "…" : ""}
                      </small>
                    </button>
                  ))}
                </div>

                {chosen && (
                  <div style={{ padding: 16, display: "grid", gap: 12, alignContent: "start" }}>
                    <TemplatePreview
                      headerType={chosen.header_type}
                      headerText={chosen.header_text}
                      headerImageUrl={chosen.header_image_url}
                      body={chosen.body}
                      footer={chosen.footer}
                      buttons={chosen.buttons}
                      values={values}
                      examples={Object.fromEntries(chosen.variables.map((v) => [v.key, v.example]))}
                    />

                    {chosen.variables.length > 0 && (
                      <div style={{ display: "grid", gap: 8 }}>
                        {chosen.variables.map((v) => {
                          const known = WA_LEAD_FIELDS.find((f) => f.key === v.key);
                          return (
                            <label key={v.key} className="row" style={{ gap: 8, alignItems: "center" }}>
                              <span style={{ width: 120, fontSize: 12.5, fontWeight: 600 }}>
                                {known?.label ?? v.key.replace(/_/g, " ")}
                              </span>
                              <input
                                type="text"
                                value={values[v.key] ?? ""}
                                placeholder={known ? "Filled from the lead" : `e.g. ${v.example}`}
                                onChange={(e) => setValues({ ...values, [v.key]: e.target.value })}
                                style={{ flex: 1 }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {err && (
                      <div className="msg err" role="alert" style={{ margin: 0 }}>
                        {err}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn"
                      disabled={busy || missing.length > 0}
                      onClick={send}
                      style={{ justifyContent: "center" }}
                    >
                      {busy
                        ? "Sending…"
                        : missing.length
                          ? `Fill in ${missing.map((v) => v.key.replace(/_/g, " ")).join(", ")}`
                          : "Send"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

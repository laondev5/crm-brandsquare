"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { createWaTemplateAction, uploadWaTemplateImageAction } from "@/app/actions/wa-templates";
import {
  WA_LEAD_FIELDS,
  WA_TEMPLATE_LANGUAGES,
  waTemplateFields,
  type WaButton,
  type WaHeaderType,
  type WaTemplate,
} from "@/lib/types";
import TemplatePreview from "./template-preview";

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const isLeadField = (k: string) => WA_LEAD_FIELDS.some((f) => f.key === k);

function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 2,
        gap: 2,
        background: "#fff",
      }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            style={{
              border: 0,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: on ? "var(--p)" : "transparent",
              color: on ? "#fff" : "var(--txt)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  title,
  optional,
  hint,
  children,
}: {
  title: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 16 }}>
      <h3 style={{ fontSize: 13.5, margin: 0, color: "var(--ink)" }}>
        {title}
        {optional && <span style={{ fontWeight: 400, color: "var(--muted)" }}> — optional</span>}
      </h3>
      {hint && <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 10px" }}>{hint}</p>}
      <div style={{ marginTop: hint ? 0 : 10 }}>{children}</div>
    </section>
  );
}

const Count = ({ n, max }: { n: number; max: number }) => (
  <small style={{ color: n > max ? "var(--err)" : "var(--muted)", fontSize: 11 }}>
    {n}/{max}
  </small>
);

const BUTTON_KIND: Record<WaButton["type"], string> = {
  quick_reply: "Quick reply",
  url: "Website link",
  phone: "Call number",
};

/**
 * Builds a template the way WhatsApp Manager does -- optional header, the
 * message, an optional footer and optional buttons -- with the phone preview
 * beside it updating as you type. Meta's rules are checked here too, so a
 * mistake shows up next to the field rather than as a rejection later.
 */
export default function TemplateBuilder({ from }: { from: WaTemplate | null }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  const [label, setLabel] = useState(from ? `${from.label} copy` : "");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY">(
    from?.category === "UTILITY" ? "UTILITY" : "MARKETING"
  );
  const [language, setLanguage] = useState(from?.language ?? "en");
  const [headerType, setHeaderType] = useState<WaHeaderType>(from?.header_type ?? "none");
  const [headerText, setHeaderText] = useState(from?.header_text ?? "");
  const [headerImageUrl, setHeaderImageUrl] = useState(from?.header_image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [body, setBody] = useState(from?.body ?? "");
  const [footer, setFooter] = useState(from?.footer ?? "");
  const [buttons, setButtons] = useState<WaButton[]>(from?.buttons ?? []);
  const [examples, setExamples] = useState<Record<string, string>>(
    Object.fromEntries((from?.variables ?? []).map((v) => [v.key, v.example]))
  );
  const [customName, setCustomName] = useState("");

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fields = waTemplateFields(body);
  const custom = fields.filter((k) => !isLeadField(k));

  // Meta will not take quick replies mixed in with the other buttons; the
  // plugin groups them, and the preview shows them in that same order.
  const ordered = [
    ...buttons.filter((b) => b.type === "quick_reply"),
    ...buttons.filter((b) => b.type !== "quick_reply"),
  ];
  const nUrl = buttons.filter((b) => b.type === "url").length;
  const nPhone = buttons.filter((b) => b.type === "phone").length;

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

  const addCustom = () => {
    const key = slug(customName).replace(/^[^a-z]+/, "").slice(0, 31);
    if (!key) return;
    insert(key);
    setCustomName("");
  };

  const addButton = (type: WaButton["type"]) =>
    setButtons([
      ...buttons,
      type === "url"
        ? { type, text: "", url: "https://" }
        : type === "phone"
          ? { type, text: "", phone: "+234" }
          : { type, text: "" },
    ]);
  const updateButton = (i: number, patch: Partial<{ text: string; url: string; phone: string }>) =>
    setButtons(buttons.map((b, j) => (j === i ? ({ ...b, ...patch } as WaButton) : b)));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadWaTemplateImageAction(fd);
    setUploading(false);
    if ("error" in res) setErr(res.error);
    else setHeaderImageUrl(res.url);
  };

  const trimmed = body.trim();
  const problems: string[] = [];
  if (!slug(label)) problems.push("Give the template a name.");
  if (headerType === "text" && !headerText.trim()) problems.push("Write the header text, or choose no header.");
  if (headerType === "text" && headerText.length > 60) problems.push("The header can be at most 60 characters.");
  if (headerType === "image" && !headerImageUrl) problems.push("Upload the header image, or choose no header.");
  if (!trimmed) problems.push("Write the message.");
  if (body.length > 1024) problems.push("The message can be at most 1024 characters.");
  if (trimmed.startsWith("{{") || trimmed.endsWith("}}"))
    problems.push("The message cannot start or end with a field. Add a word before or after it.");
  if (/\}\}\s*\{\{/.test(body)) problems.push("Two fields cannot sit side by side. Put a word between them.");
  if ((body.match(/\{\{/g) ?? []).length !== (body.match(/\{\{\s*[a-z][a-z0-9_]{0,30}\s*\}\}/g) ?? []).length)
    problems.push("Fields look like {{first_name}}: lowercase letters, numbers and underscores.");
  for (const k of custom) if (!examples[k]?.trim()) problems.push(`Give an example of what {{${k}}} will say.`);
  if (footer.length > 60) problems.push("The footer can be at most 60 characters.");
  for (const b of buttons) {
    if (!b.text.trim()) problems.push("Every button needs a label.");
    else if (b.text.length > 25) problems.push(`"${b.text}" is longer than the 25 characters a button allows.`);
    if (b.type === "url" && !/^https?:\/\/[^\s.]+\.\S+/.test(b.url))
      problems.push(`The "${b.text || "website"}" button needs a web address starting with https://.`);
    if (b.type === "phone" && b.phone.replace(/\D/g, "").length < 8)
      problems.push(`The "${b.text || "call"}" button needs a full number with the country code.`);
  }
  const unique = [...new Set(problems)];

  const submit = () => {
    setErr("");
    start(async () => {
      const res = await createWaTemplateAction({
        label,
        language,
        category,
        header_type: headerType,
        header_text: headerText,
        header_image_url: headerImageUrl,
        body,
        footer,
        buttons: ordered,
        examples: Object.fromEntries(custom.map((k) => [k, examples[k] ?? ""])),
      });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      router.push(`/templates/whatsapp?created=${res.status}`);
    });
  };

  return (
    <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 1fr) 360px" }}>
      <div className="card">
        <label className="f">
          <span>Template name</span>
          <input
            type="text"
            value={label}
            maxLength={120}
            placeholder="Quote follow-up"
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        {slug(label) && (
          <small style={{ display: "block", color: "var(--muted)", marginTop: -6 }}>
            Meta will know it as <code>{slug(label)}</code>
          </small>
        )}

        <div className="row" style={{ gap: 20, flexWrap: "wrap", marginTop: 14 }}>
          <div>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Type</span>
            <Choice
              label="Type"
              value={category}
              onChange={setCategory}
              options={[
                { value: "MARKETING", label: "Marketing" },
                { value: "UTILITY", label: "Utility" },
              ]}
            />
          </div>
          <label className="f" style={{ margin: 0, minWidth: 180 }}>
            <span>Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {WA_TEMPLATE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
          {category === "MARKETING"
            ? "Marketing: offers, follow-ups, “are you still interested?” — anything that sells. Most templates are this."
            : "Utility: an update about something the customer asked for — their quote is ready, a delivery date. Meta moves it to Marketing if it reads like a sales message."}
        </p>

        <Section title="Header" optional hint="A bold title or a picture above the message.">
          <Choice
            label="Header"
            value={headerType}
            onChange={setHeaderType}
            options={[
              { value: "none", label: "None" },
              { value: "text", label: "Text" },
              { value: "image", label: "Image" },
            ]}
          />
          {headerType === "text" && (
            <label className="f" style={{ marginTop: 12 }}>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                Header text <Count n={headerText.length} max={60} />
              </span>
              <input
                type="text"
                value={headerText}
                placeholder="Your quote is ready"
                onChange={(e) => setHeaderText(e.target.value)}
              />
            </label>
          )}
          {headerType === "image" && (
            <div style={{ marginTop: 12 }}>
              {headerImageUrl ? (
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a WordPress media URL */}
                  <img
                    src={headerImageUrl}
                    alt="Header"
                    style={{ width: 96, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                  <label className="btn ghost sm" style={{ cursor: "pointer" }}>
                    Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      hidden
                      onChange={(e) => onFile(e.target.files?.[0])}
                    />
                  </label>
                  <button type="button" className="btn ghost sm" onClick={() => setHeaderImageUrl("")}>
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    border: "1.5px dashed var(--line)",
                    borderRadius: 8,
                    padding: "18px 12px",
                    cursor: "pointer",
                    color: "var(--txt)",
                    fontSize: 13,
                  }}
                >
                  <ImagePlus className="size-4" aria-hidden="true" />
                  {uploading ? "Uploading…" : "Choose a JPG or PNG, up to 5 MB"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    hidden
                    disabled={uploading}
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </label>
              )}
              <small style={{ display: "block", color: "var(--muted)", marginTop: 6 }}>
                The same picture goes out every time this template is sent.
              </small>
            </div>
          )}
        </Section>

        <Section
          title="Message"
          hint="Add fields to personalise it — they fill in from the lead when you send."
        >
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {WA_LEAD_FIELDS.map((f) => (
              <button key={f.key} type="button" className="btn ghost sm" onClick={() => insert(f.key)}>
                + {f.label}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            rows={7}
            value={body}
            placeholder={"Hello {{first_name}}, thanks for your interest in our machines. Your quote is ready — shall I send it over?"}
            onChange={(e) => setBody(e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8, flexWrap: "wrap" }}>
            <div className="row" style={{ gap: 6 }}>
              <input
                type="text"
                value={customName}
                placeholder="Other field, e.g. machine"
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                style={{ width: 190, fontSize: 12.5 }}
              />
              <button type="button" className="btn ghost sm" onClick={addCustom} disabled={!slug(customName)}>
                + Add field
              </button>
            </div>
            <Count n={body.length} max={1024} />
          </div>

          {custom.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <small style={{ color: "var(--muted)" }}>
                The CRM cannot fill these in, so you type them when sending. Meta wants an example of
                each to review:
              </small>
              {custom.map((k) => (
                <label key={k} className="row" style={{ gap: 8, alignItems: "center" }}>
                  <code style={{ minWidth: 120, fontSize: 12 }}>{`{{${k}}}`}</code>
                  <input
                    type="text"
                    value={examples[k] ?? ""}
                    placeholder="e.g. rice mill"
                    onChange={(e) => setExamples({ ...examples, [k]: e.target.value })}
                    style={{ flex: 1 }}
                  />
                </label>
              ))}
            </div>
          )}
        </Section>

        <Section title="Footer" optional hint="Small grey text under the message.">
          <label className="f" style={{ margin: 0 }}>
            <span style={{ display: "flex", justifyContent: "flex-end" }}>
              <Count n={footer.length} max={60} />
            </span>
            <input
              type="text"
              value={footer}
              placeholder="Brandsquare · Reply STOP to opt out"
              onChange={(e) => setFooter(e.target.value)}
            />
          </label>
        </Section>

        <Section
          title="Buttons"
          optional
          hint="Up to 10. Quick replies let them answer with one tap; links and calls open straight from the message."
        >
          <div style={{ display: "grid", gap: 8 }}>
            {buttons.map((b, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: b.type === "quick_reply" ? "110px 1fr 32px" : "110px 1fr 1fr 32px",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <small style={{ fontWeight: 600, color: "var(--txt)" }}>{BUTTON_KIND[b.type]}</small>
                <input
                  type="text"
                  value={b.text}
                  maxLength={25}
                  placeholder={b.type === "quick_reply" ? "Yes, send it" : b.type === "url" ? "See the machine" : "Call us"}
                  onChange={(e) => updateButton(i, { text: e.target.value })}
                  aria-label="Button label"
                />
                {b.type === "url" && (
                  <input
                    type="url"
                    value={b.url}
                    onChange={(e) => updateButton(i, { url: e.target.value })}
                    aria-label="Web address"
                  />
                )}
                {b.type === "phone" && (
                  <input
                    type="tel"
                    value={b.phone}
                    onChange={(e) => updateButton(i, { phone: e.target.value })}
                    aria-label="Phone number"
                  />
                )}
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ padding: 6 }}
                  aria-label="Remove button"
                  onClick={() => setButtons(buttons.filter((_, j) => j !== i))}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 6, marginTop: buttons.length ? 10 : 0, flexWrap: "wrap" }}>
            <button type="button" className="btn ghost sm" disabled={buttons.length >= 10} onClick={() => addButton("quick_reply")}>
              + Quick reply
            </button>
            <button type="button" className="btn ghost sm" disabled={buttons.length >= 10 || nUrl >= 2} onClick={() => addButton("url")}>
              + Website link
            </button>
            <button type="button" className="btn ghost sm" disabled={buttons.length >= 10 || nPhone >= 1} onClick={() => addButton("phone")}>
              + Call number
            </button>
          </div>
        </Section>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 16 }}>
          {err && (
            <div className="msg err" role="alert">
              {err}
            </div>
          )}
          {unique.length > 0 && (label || body) && (
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 12.5, color: "#854f0b" }}>
              {unique.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn"
            disabled={busy || uploading || unique.length > 0}
            onClick={submit}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {busy ? "Sending to Meta…" : "Submit for review"}
          </button>
          <small style={{ display: "block", color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
            Meta usually answers within minutes. Approved templates can&rsquo;t be edited — make a copy
            instead.
          </small>
        </div>
      </div>

      <div style={{ position: "sticky", top: 16 }}>
        <div className="card">
          <h2>Preview</h2>
          <TemplatePreview
            headerType={headerType}
            headerText={headerText}
            headerImageUrl={headerImageUrl}
            body={body}
            footer={footer}
            buttons={ordered}
            examples={examples}
          />
          <small style={{ display: "block", color: "var(--muted)", marginTop: 10 }}>
            Green words are sample values. The lead&rsquo;s real details take their place when it is
            sent.
          </small>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { fillResponse, groupBySection, type KbItem, type KbKind } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn sm ${done ? "" : "ghost"}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard blocked (an old browser, an insecure page): fall back.
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span style={{ marginLeft: 4 }}>{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

/** Blanks still to fill, highlighted so they are not sent by mistake. */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\]|\$_+)/g).map((part, i) =>
        /^\[[^\]]+\]$|^\$_+$/.test(part) ? (
          <mark key={i} style={{ background: "#fdf0c9", color: "#7a4d00", borderRadius: 3, padding: "0 2px" }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * Reading the knowledge base: search, jump to a section, and copy.
 *
 * For response templates the three blanks nearly every message has — the
 * customer's name, the machine, and your own name — can be filled once at the
 * top, and every template on the page updates, so what gets copied is ready
 * to send.
 */
export default function KbBrowser({
  kind,
  items,
  meName,
  manageHref,
}: {
  kind: KbKind;
  items: KbItem[];
  meName: string;
  manageHref?: string;
}) {
  const [q, setQ] = useState("");
  const [section, setSection] = useState("");
  const [name, setName] = useState("");
  const [machine, setMachine] = useState("");
  const [yourName, setYourName] = useState(meName);
  const [open, setOpen] = useState<number | null>(null);

  const sections = useMemo(() => groupBySection(items).map((g) => g.section), [items]);
  const needle = q.trim().toLowerCase();
  const shown = groupBySection(
    items.filter(
      (i) =>
        (!section || i.section === section) &&
        (!needle || `${i.title} ${i.body} ${i.section}`.toLowerCase().includes(needle))
    )
  );
  const fill = (body: string) => (kind === "response" ? fillResponse(body, { name, machine, yourName }) : body);

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={kind === "faq" ? "Search questions and answers…" : "Search templates…"}
            style={{ flex: "1 1 240px" }}
            aria-label="Search"
          />
          <select value={section} onChange={(e) => setSection(e.target.value)} style={{ width: 240 }} aria-label="Section">
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {manageHref && (
            <Link href={manageHref} className="btn">
              {kind === "faq" ? "Add or edit FAQs" : "Add or edit templates"}
            </Link>
          )}
        </div>

        {kind === "response" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 12 }}>
            <label className="f" style={{ margin: 0 }}>
              <span>Customer name — fills [Name]</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amina" />
            </label>
            <label className="f" style={{ margin: 0 }}>
              <span>Machine — fills [Machine Name]</span>
              <input type="text" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="YJ-1 Oil Press" />
            </label>
            <label className="f" style={{ margin: 0 }}>
              <span>Your name — fills [Your Name]</span>
              <input type="text" value={yourName} onChange={(e) => setYourName(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <p className="empty">{items.length ? "Nothing matches that search." : "Nothing here yet."}</p>
        </div>
      ) : (
        shown.map((g) => (
          <section key={g.section} style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, color: "var(--ink)", margin: "0 0 10px" }}>{g.section}</h2>

            {kind === "faq" ? (
              <div className="card" style={{ padding: 0 }}>
                {g.items.map((it, i) => {
                  const isOpen = open === it.id || !!needle;
                  return (
                    <div key={it.id} style={{ borderTop: i ? "1px solid var(--line)" : 0 }}>
                      <button
                        type="button"
                        onClick={() => setOpen(open === it.id ? null : it.id)}
                        aria-expanded={isOpen}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}
                      >
                        <strong style={{ flex: 1, color: "var(--ink)", fontSize: 14 }}>{it.title}</strong>
                        <ChevronDown className="size-4" style={{ transform: isOpen ? "rotate(180deg)" : undefined, flexShrink: 0 }} />
                      </button>
                      {isOpen && (
                        <div style={{ padding: "0 16px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <p style={{ margin: 0, flex: 1, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{it.body}</p>
                          <CopyButton text={it.body} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {g.items.map((it) => {
                  const text = fill(it.body);
                  return (
                    <div key={it.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <strong style={{ flex: 1, color: "var(--ink)", fontSize: 14 }}>{it.title}</strong>
                        <CopyButton text={text} />
                      </div>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--txt)" }}>
                        <Highlighted text={text} />
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))
      )}
    </>
  );
}

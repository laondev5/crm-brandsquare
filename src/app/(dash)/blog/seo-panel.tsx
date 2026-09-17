"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { scoreColour, scoreLabel, type SeoResult } from "@/lib/seo";

const Meter = ({ n, min, max }: { n: number; min: number; max: number }) => {
  const ok = n >= min && n <= max;
  return (
    <small style={{ fontSize: 11, color: n === 0 ? "var(--muted)" : ok ? "#0f6e56" : "#b45309" }}>
      {n} / {max} characters{n > 0 && !ok ? (n < min ? " — a little short" : " — will be cut off") : ""}
    </small>
  );
};

/**
 * Rank Math's box, in the CRM: the three fields it asks for, a Google preview
 * built from them, and the score with every check that went into it.
 */
export default function SeoPanel({
  keyword,
  setKeyword,
  seoTitle,
  setSeoTitle,
  description,
  setDescription,
  title,
  slug,
  siteUrl,
  excerpt,
  result,
}: {
  keyword: string;
  setKeyword: (v: string) => void;
  seoTitle: string;
  setSeoTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  title: string;
  slug: string;
  siteUrl: string;
  excerpt: string;
  result: SeoResult;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ "Basic SEO": true });
  const c = scoreColour(result.score);
  const shownTitle = seoTitle.trim() || title || "Post title";
  const shownDesc = description.trim() || excerpt.trim() || "Add a meta description to control the text Google shows under the title.";
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          aria-label={`SEO score ${result.score} out of 100`}
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            background: `conic-gradient(${c} ${result.score * 3.6}deg, #eceef3 0deg)`,
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center" }}>
            <strong style={{ color: c, fontSize: 16 }}>{result.score}</strong>
          </div>
        </div>
        <div>
          <h2 style={{ margin: 0 }}>Rank Math SEO</h2>
          <small style={{ color: keyword ? c : "var(--muted)", fontWeight: 600 }}>
            {keyword ? `${scoreLabel(result.score)} · ${result.score}/100` : "Add a focus keyword to score this post"}
          </small>
        </div>
      </div>

      <label className="f">
        <span>Focus keyword</span>
        <input
          type="text"
          value={keyword}
          placeholder="e.g. oil press machine"
          onChange={(e) => setKeyword(e.target.value)}
        />
      </label>

      <label className="f">
        <span>SEO title</span>
        <input type="text" value={seoTitle} placeholder={title || "Defaults to the post title"} onChange={(e) => setSeoTitle(e.target.value)} />
        <Meter n={(seoTitle.trim() || title).length} min={30} max={60} />
      </label>

      <label className="f">
        <span>Meta description</span>
        <textarea rows={3} value={description} placeholder="One or two sentences that make someone click, including the focus keyword." onChange={(e) => setDescription(e.target.value)} />
        <Meter n={description.trim().length} min={120} max={160} />
      </label>

      <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 14, background: "#fff" }}>
        <small style={{ color: "#5f6368", fontSize: 12 }}>
          {host} › {slug || "post-url"}
        </small>
        <div style={{ color: "#1a0dab", fontSize: 17, lineHeight: 1.3, margin: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shownTitle}
        </div>
        <div style={{ color: "#4d5156", fontSize: 13, lineHeight: 1.45 }}>
          {shownDesc.length > 160 ? shownDesc.slice(0, 157) + "…" : shownDesc}
        </div>
      </div>

      {result.groups.map((g) => {
        const passed = g.tests.filter((t) => t.pass).length;
        const isOpen = open[g.label] ?? false;
        return (
          <div key={g.label} style={{ borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={() => setOpen({ ...open, [g.label]: !isOpen })}
              aria-expanded={isOpen}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", padding: "10px 0", cursor: "pointer", fontWeight: 600, color: "var(--ink)", fontSize: 13 }}
            >
              <span style={{ flex: 1, textAlign: "left" }}>{g.label}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 8px",
                  borderRadius: 99,
                  background: passed === g.tests.length ? "#eaf6f1" : "#fef3f3",
                  color: passed === g.tests.length ? "#0f6e56" : "#a32d2d",
                }}
              >
                {passed === g.tests.length ? "All good" : `${g.tests.length - passed} to fix`}
              </span>
              <ChevronDown className="size-4" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
            </button>
            {isOpen && (
              <ul style={{ listStyle: "none", margin: "0 0 10px", padding: 0, display: "grid", gap: 8 }}>
                {g.tests.map((t) => (
                  <li key={t.id} style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: t.pass ? "#10b981" : "#ef4444",
                        color: "#fff",
                        marginTop: 1,
                      }}
                    >
                      {t.pass ? <Check className="size-3" /> : <X className="size-3" />}
                    </span>
                    <span>
                      <span style={{ color: "var(--ink)" }}>{t.label}</span>
                      {!t.pass && <span style={{ display: "block", color: "var(--muted)" }}>{t.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

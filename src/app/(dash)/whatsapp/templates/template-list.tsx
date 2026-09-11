"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWaTemplateAction } from "@/app/actions/wa-templates";
import { WA_TEMPLATE_LANGUAGES, type WaTemplate } from "@/lib/types";
import TemplatePreview from "./template-preview";

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  APPROVED: { label: "Approved", bg: "#eaf6f1", fg: "#0f6e56" },
  PENDING: { label: "In review", bg: "#fdf6ea", fg: "#854f0b" },
  REJECTED: { label: "Rejected", bg: "#fef3f3", fg: "#a32d2d" },
  PAUSED: { label: "Paused", bg: "#f1efe8", fg: "#5f5e5a" },
  DISABLED: { label: "Disabled", bg: "#f1efe8", fg: "#5f5e5a" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status.toLowerCase(), bg: "#f1efe8", fg: "#5f5e5a" };
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

const language = (code: string) => WA_TEMPLATE_LANGUAGES.find((l) => l.code === code)?.label ?? code;

export default function TemplateList({
  templates,
  canManage,
}: {
  templates: WaTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  // While Meta is still deciding, keep asking -- nobody should have to reload
  // to find out their template was approved.
  const waiting = templates.some((t) => t.status === "PENDING");
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [waiting, router]);

  const remove = (t: WaTemplate) => {
    if (!confirm(`Delete "${t.label}"? It is removed from WhatsApp too, and cannot be sent again.`)) return;
    setErr("");
    start(async () => {
      const res = await deleteWaTemplateAction(t.id);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  if (templates.length === 0) {
    return (
      <div className="card">
        <p className="empty" style={{ padding: "16px 0" }}>
          No templates yet.
          {canManage ? " Create one to start conversations from a lead or pick up old ones." : " An admin can create them."}
        </p>
      </div>
    );
  }

  return (
    <>
      {err && <div className="msg err">{err}</div>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 16,
        }}
      >
        {templates.map((t) => (
          <div key={t.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ color: "var(--ink)", fontSize: 14 }}>{t.label}</strong>
                <br />
                <small style={{ color: "var(--muted)" }}>
                  {t.category === "UTILITY" ? "Utility" : t.category === "MARKETING" ? "Marketing" : t.category}
                  {" · "}
                  {language(t.language)}
                </small>
              </div>
              <StatusBadge status={t.status} />
            </div>

            {t.status === "REJECTED" && (
              <div className="msg err" style={{ margin: 0, fontSize: 12 }}>
                Meta rejected this{t.rejected_reason ? `: ${t.rejected_reason.toLowerCase().replace(/_/g, " ")}` : ""}.
                Make a copy, change the wording and submit it again.
              </div>
            )}

            <TemplatePreview
              compact
              headerType={t.header_type}
              headerText={t.header_text}
              headerImageUrl={t.header_image_url}
              body={t.body}
              footer={t.footer}
              buttons={t.buttons}
              examples={Object.fromEntries(t.variables.map((v) => [v.key, v.example]))}
            />

            {canManage && (
              <div className="row" style={{ gap: 8, marginTop: "auto" }}>
                <Link href={`/templates/whatsapp/new?from=${t.id}`} className="btn ghost sm">
                  Make a copy
                </Link>
                <div className="spacer" />
                <button className="btn danger sm" disabled={busy} onClick={() => remove(t)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

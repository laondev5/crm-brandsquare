import { BLOG_STATUS_LABEL } from "@/lib/types";
import { scoreColour } from "@/lib/seo";
import LineChart, { type ChartPoint } from "../line-chart";

/** Rank Math's score as a coloured chip — green, amber or red, the same bands. */
export function SeoBadge({ score, keyword }: { score: number; keyword?: string }) {
  if (!keyword && !score) {
    return <span style={{ fontSize: 12, color: "var(--muted)" }}>No keyword</span>;
  }
  const c = scoreColour(score);
  return (
    <span
      title={keyword ? `Focus keyword: ${keyword}` : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 9px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        color: c,
        background: `color-mix(in srgb, ${c} 12%, #fff)`,
        border: `1px solid color-mix(in srgb, ${c} 35%, #fff)`,
      }}
    >
      {score}/100
    </span>
  );
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  publish: { bg: "#eaf6f1", fg: "#0f6e56" },
  draft: { bg: "#f1efe8", fg: "#5f5e5a" },
  future: { bg: "#e6f1fb", fg: "#0c447c" },
  pending: { bg: "#fdf6ea", fg: "#854f0b" },
  private: { bg: "#f3f2f8", fg: "#3c3a55" },
};

export function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg }}>
      {BLOG_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function fmtDate(d: string, withTime = false) {
  const dt = new Date(d.replace(" ", "T"));
  if (isNaN(dt.getTime())) return d;
  return withTime
    ? dt.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function seconds(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

export function ViewsChart({ series }: { series: { date: string; views: number; visitors: number }[] }) {
  const points: ChartPoint[] = series.map((d) => ({
    label: d.date.slice(5).replace("-", "/"),
    title: new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    values: { views: d.views, visitors: d.visitors },
  }));
  return (
    <LineChart
      points={points}
      series={[
        { key: "views", label: "Views", colour: "var(--p)", area: true },
        { key: "visitors", label: "Readers", colour: "var(--st-new)" },
      ]}
      emptyNote="Not enough days yet to draw a trend."
    />
  );
}

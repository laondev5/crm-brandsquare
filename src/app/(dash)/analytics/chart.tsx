import type { DayStat } from "@/lib/types";

/**
 * Visitors and enquiries over time, as inline SVG.
 *
 * No charting library: this is two series and a baseline, and the smallest
 * chart package is larger than the whole dashboard's JavaScript. Rendered on
 * the server, so it costs the browser nothing.
 */
export default function TrafficChart({ daily }: { daily: DayStat[] }) {
  if (daily.length < 2) {
    return (
      <p className="empty" style={{ padding: "26px 0" }}>
        Not enough days yet to draw a trend.
      </p>
    );
  }

  const W = 760;
  const H = 180;
  const PAD = { top: 12, right: 8, bottom: 22, left: 34 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  const peak = Math.max(1, ...daily.map((d) => d.visitors));
  const x = (i: number) => PAD.left + (i / (daily.length - 1)) * iw;
  const y = (v: number) => PAD.top + ih - (v / peak) * ih;

  const line = daily.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.visitors).toFixed(1)}`).join(" ");
  const area = `${line} L${x(daily.length - 1).toFixed(1)},${PAD.top + ih} L${PAD.left},${PAD.top + ih} Z`;

  // Enquiries share the visitor scale so the gap between the two lines reads
  // as the drop-off it is. A second axis would make a flat line look healthy.
  const convLine = daily
    .map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.conversions).toFixed(1)}`)
    .join(" ");

  const ticks = [0, Math.round(peak / 2), peak];
  const labelEvery = Math.ceil(daily.length / 6);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label={`Visitors and enquiries over the last ${daily.length} days`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}

        <path d={area} fill="var(--st-new-soft)" />
        <path d={line} fill="none" stroke="var(--st-new)" strokeWidth="2" strokeLinejoin="round" />
        <path d={convLine} fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinejoin="round" />

        {daily.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
              {d.day.slice(5)}
            </text>
          ) : null
        )}
      </svg>

      <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
        <span style={{ color: "var(--st-new)", fontWeight: 700 }}>—</span> visitors{"  "}
        <span style={{ color: "var(--ok)", fontWeight: 700 }}>—</span> enquiries
      </p>
    </div>
  );
}

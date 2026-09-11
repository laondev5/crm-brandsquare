"use client";

import { useState } from "react";

export interface ChartSeries {
  key: string;
  label: string;
  colour: string;
  /** Shade the area under this line. Only sensible on the leading series. */
  area?: boolean;
}

export interface ChartPoint {
  /** Short label under the axis, e.g. "05/09". */
  label: string;
  /** Heading of the hover card, e.g. "Friday 5 September". */
  title: string;
  values: Record<string, number>;
  /** Extra rows in the hover card that are not lines — a rate, a note. */
  extra?: { label: string; value: string }[];
}

/**
 * A line chart with a hover card.
 *
 * Shared rather than written per screen, because every chart in the CRM
 * needs the same thing: a shape you can read at a glance, and the actual
 * numbers for whichever day you are pointing at. A chart you cannot
 * interrogate makes you go and find the same numbers somewhere else.
 *
 * The hover targets are full-height bands, one per point, rather than the
 * dots. Hitting a 3px circle with a mouse is a game; hitting the column above
 * a date is not, and it is the same gesture on a trackpad.
 */
export default function LineChart({
  points,
  series,
  height = 190,
  emptyNote = "Not enough days yet to draw a trend.",
}: {
  points: ChartPoint[];
  series: ChartSeries[];
  height?: number;
  emptyNote?: string;
}) {
  const [at, setAt] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="empty" style={{ padding: "26px 0" }}>
        {emptyNote}
      </p>
    );
  }

  const W = 760;
  const H = height;
  const PAD = { top: 12, right: 10, bottom: 24, left: 36 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  // One scale for every series: a second axis makes a flat line look healthy
  // next to a busy one, which is the most common way a chart lies.
  const peak = Math.max(
    1,
    ...points.flatMap((p) => series.map((s) => p.values[s.key] ?? 0))
  );

  const x = (i: number) => PAD.left + (i / (points.length - 1)) * iw;
  const y = (v: number) => PAD.top + ih - (v / peak) * ih;

  const path = (s: ChartSeries) =>
    points
      .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.values[s.key] ?? 0).toFixed(1)}`)
      .join(" ");

  const ticks = [...new Set([0, Math.round(peak / 2), peak])];
  const labelEvery = Math.ceil(points.length / 7);
  const band = iw / points.length;

  const hovered = at === null ? null : points[at];

  // Keep the card on screen at both ends rather than letting it hang off the
  // edge on the first and last day, which are the two you check most.
  const cardLeftPct = at === null ? 0 : (x(at) / W) * 100;
  const flip = cardLeftPct > 62;

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`${series.map((s) => s.label).join(" and ")} over ${points.length} days`}
        onMouseLeave={() => setAt(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}

        {series
          .filter((s) => s.area)
          .map((s) => (
            <path
              key={`area-${s.key}`}
              d={`${path(s)} L${x(points.length - 1).toFixed(1)},${PAD.top + ih} L${PAD.left},${PAD.top + ih} Z`}
              fill={s.colour}
              opacity="0.12"
            />
          ))}

        {series.map((s) => (
          <path
            key={s.key}
            d={path(s)}
            fill="none"
            stroke={s.colour}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {at !== null && (
          <line
            x1={x(at)}
            x2={x(at)}
            y1={PAD.top}
            y2={PAD.top + ih}
            stroke="var(--muted)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {at !== null &&
          series.map((s) => (
            <circle
              key={`dot-${s.key}`}
              cx={x(at)}
              cy={y(points[at].values[s.key] ?? 0)}
              r="4"
              fill="#fff"
              stroke={s.colour}
              strokeWidth="2"
            />
          ))}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={`lab-${p.label}-${i}`}
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
            >
              {p.label}
            </text>
          ) : null
        )}

        {/* Invisible hit bands, on top of everything, one per point. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={PAD.left + band * i - band / 2 + band / 2}
            y={PAD.top}
            width={band}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setAt(i)}
            onFocus={() => setAt(i)}
            tabIndex={0}
            role="button"
            aria-label={`${p.title}: ${series
              .map((s) => `${p.values[s.key] ?? 0} ${s.label}`)
              .join(", ")}`}
            style={{ cursor: "crosshair", outline: "none" }}
          />
        ))}
      </svg>

      {hovered && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 8,
            left: `${flip ? cardLeftPct - 2 : cardLeftPct + 2}%`,
            transform: flip ? "translateX(-100%)" : undefined,
            minWidth: 168,
            background: "var(--card, #fff)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 10px 28px rgba(3,0,26,.14)",
            padding: "10px 12px",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--ink)", marginBottom: 6 }}>
            {hovered.title}
          </div>

          {series.map((s) => (
            <div
              key={s.key}
              className="row"
              style={{ justifyContent: "space-between", gap: 14, fontSize: 12.5, marginTop: 2 }}
            >
              <span className="row" style={{ gap: 6, alignItems: "center", color: "var(--txt)" }}>
                <span
                  style={{ width: 8, height: 8, borderRadius: 2, background: s.colour, flex: "none" }}
                />
                {s.label}
              </span>
              <b style={{ color: "var(--ink)" }}>
                {(hovered.values[s.key] ?? 0).toLocaleString()}
              </b>
            </div>
          ))}

          {hovered.extra?.map((row) => (
            <div
              key={row.label}
              className="row"
              style={{
                justifyContent: "space-between",
                gap: 14,
                fontSize: 12,
                marginTop: 6,
                paddingTop: 6,
                borderTop: "1px solid var(--line)",
                color: "var(--muted)",
              }}
            >
              <span>{row.label}</span>
              <b style={{ color: "var(--ink)" }}>{row.value}</b>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 16, fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
        {series.map((s) => (
          <span key={s.key} className="row" style={{ gap: 6, alignItems: "center" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.colour }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

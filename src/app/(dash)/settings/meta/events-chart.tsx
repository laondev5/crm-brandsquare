import type { MetaEvent } from "@/lib/types";
import LineChart, { type ChartPoint } from "../../line-chart";

/** A day on the chart. */
type Day = { day: string; sent: number; failed: number; pending: number };

/**
 * Groups the log into days, filling the gaps.
 *
 * Missing days have to be drawn as zero rather than skipped: a chart that
 * silently closes up the quiet days makes a campaign that stopped reporting
 * for a week look like it never paused.
 */
export function byDay(events: MetaEvent[], days = 14): Day[] {
  const out: Day[] = [];
  const index = new Map<string, Day>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = { day: key, sent: 0, failed: 0, pending: 0 };
    index.set(key, row);
    out.push(row);
  }

  for (const e of events) {
    const stamp = (e.sent_at ?? e.created_at ?? "").replace(" ", "T");
    const key = stamp.slice(0, 10);
    const row = index.get(key);
    if (!row) continue;
    if (e.status === "sent") row.sent++;
    else if (e.status === "failed") row.failed++;
    else if (e.status === "pending") row.pending++;
  }

  return out;
}

/**
 * Events per day, accepted against refused.
 *
 * A line rather than bars: what matters here is the trend and whether the
 * refused line ever lifts off the floor, and two lines answer that faster
 * than a stack you have to read the segments of. Hovering a day gives the
 * actual numbers, plus the share Meta accepted — which is the figure that
 * tells you whether the integration is healthy.
 */
export default function EventsChart({ events }: { events: MetaEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="empty" style={{ padding: "26px 0" }}>
        Nothing has been sent yet.
      </p>
    );
  }

  const daily = byDay(events);

  const points: ChartPoint[] = daily.map((d) => {
    const attempted = d.sent + d.failed;
    return {
      label: `${d.day.slice(8)}/${d.day.slice(5, 7)}`,
      title: new Date(d.day + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      values: { sent: d.sent, failed: d.failed, pending: d.pending },
      extra: [
        {
          label: "Accepted",
          value: attempted === 0 ? "—" : `${Math.round((d.sent / attempted) * 100)}%`,
        },
      ],
    };
  });

  return (
    <LineChart
      points={points}
      series={[
        { key: "sent", label: "Accepted", colour: "var(--ok)", area: true },
        { key: "failed", label: "Refused", colour: "var(--err)" },
        { key: "pending", label: "Waiting", colour: "var(--muted)" },
      ]}
      emptyNote="Not enough days yet to draw a trend."
    />
  );
}

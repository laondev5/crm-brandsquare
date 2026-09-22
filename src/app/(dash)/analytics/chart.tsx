import type { DayStat } from "@/lib/types";
import LineChart, { type ChartPoint } from "../line-chart";

/**
 * Visitors and enquiries over time.
 *
 * Enquiries share the visitor scale so the gap between the two lines reads as
 * the drop-off it is — a second axis would make a flat line look healthy.
 *
 * Hovering a day gives the numbers behind that point plus the conversion rate
 * for it, which is the figure you would otherwise go and work out by hand.
 */
export default function TrafficChart({ daily, hourly = false }: { daily: DayStat[]; hourly?: boolean }) {
  const points: ChartPoint[] = daily.map((d) => {
    const rate = d.views > 0 ? (d.conversions / d.views) * 100 : 0;
    // Hourly points arrive as "2026-09-22 14:00" in the site's own time.
    const [date, time] = d.day.split(" ");
    return {
      label: hourly && time ? time : d.day.slice(5),
      title:
        new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }) + (hourly && time ? `, ${time} to ${time.slice(0, 2)}:59` : ""),
      values: { visitors: d.visitors, conversions: d.conversions, views: d.views },
      extra: [
        { label: "Page views", value: d.views.toLocaleString() },
        {
          label: "Conversion",
          value: d.views === 0 ? "—" : `${rate.toFixed(1)}%`,
        },
      ],
    };
  });

  return (
    <LineChart
      points={points}
      series={[
        { key: "visitors", label: "Visitors", colour: "var(--st-new)", area: true },
        { key: "conversions", label: "Enquiries", colour: "var(--ok)" },
      ]}
      unit={hourly ? "hours" : "days"}
      emptyNote={hourly ? "No visits in the last 24 hours." : "Not enough days yet to draw a trend."}
    />
  );
}

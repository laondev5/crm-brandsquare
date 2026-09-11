import type { Workday } from "@/lib/types";

/** Monday-based week key, so a week reads the way a working week does. */
function weekOf(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return { key: dateStr, start: d, end: d };
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { key: start.toISOString().slice(0, 10), start, end };
}

function range(start: Date, end: Date) {
  const f = (x: Date, withYear = false) =>
    x.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });
  return `${f(start)} – ${f(end, true)}`;
}

function dayLabel(d: string) {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function clock(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function minutes(a: string | null, b: string | null) {
  if (!a || !b) return 0;
  const x = new Date(a.replace(" ", "T")).getTime();
  const y = new Date(b.replace(" ", "T")).getTime();
  if (isNaN(x) || isNaN(y) || y < x) return 0;
  return Math.floor((y - x) / 60000);
}

function hours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/**
 * What somebody reported, by day and rolled up by week.
 *
 * The weekly view is built from the daily ones rather than asked for
 * separately. Nobody writes the same thing twice, and a weekly report that has
 * to be composed on a Friday is a weekly report that stops being written by
 * the third week.
 */
export default function Reports({
  history,
  view,
}: {
  history: Workday[];
  view: "daily" | "weekly";
}) {
  if (history.length === 0) {
    return (
      <div className="card">
        <p className="empty">
          Nothing reported yet. Sign out at the end of a day and it appears here.
        </p>
      </div>
    );
  }

  if (view === "daily") {
    return (
      <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Day</th>
              <th style={{ width: 140 }}>Hours</th>
              <th>What they got done</th>
              <th style={{ width: 230 }}>Blocked by</th>
            </tr>
          </thead>
          <tbody>
            {history.map((d) => (
              <tr key={d.work_date}>
                <td data-l="Day" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {dayLabel(d.work_date)}
                </td>
                <td data-l="Hours">
                  {clock(d.signed_in_at)} – {clock(d.signed_out_at)}
                  <br />
                  <small style={{ color: "var(--muted)" }}>
                    {hours(minutes(d.signed_in_at, d.signed_out_at))}
                  </small>
                </td>
                <td data-l="Done" style={{ whiteSpace: "pre-wrap" }}>
                  {d.summary || <span style={{ color: "var(--muted)" }}>No report</span>}
                  {d.plan_tomorrow && (
                    <>
                      <br />
                      <small style={{ color: "var(--muted)" }}>
                        Next: {d.plan_tomorrow}
                      </small>
                    </>
                  )}
                </td>
                <td data-l="Blocked" style={{ whiteSpace: "pre-wrap", color: "var(--err)" }}>
                  {d.blockers || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Weekly: group the days, keep every line they wrote, and total the hours.
  const weeks = new Map<string, { start: Date; end: Date; days: Workday[] }>();
  for (const d of history) {
    const w = weekOf(d.work_date);
    const found = weeks.get(w.key);
    if (found) found.days.push(d);
    else weeks.set(w.key, { start: w.start, end: w.end, days: [d] });
  }

  return (
    <>
      {[...weeks.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, w]) => {
          const worked = w.days.reduce(
            (n, d) => n + minutes(d.signed_in_at, d.signed_out_at),
            0
          );
          const reported = w.days.filter((d) => d.summary).length;
          const blockers = w.days.filter((d) => d.blockers);

          return (
            <div className="card" key={key}>
              <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>{range(w.start, w.end)}</h2>
                <span className="pill">{w.days.length} day{w.days.length === 1 ? "" : "s"}</span>
                <span className="pill">{hours(worked)} on the clock</span>
                {blockers.length > 0 && (
                  <span className="pill s-disabled">
                    {blockers.length} blocked day{blockers.length === 1 ? "" : "s"}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {reported}/{w.days.length} reported
                </span>
              </div>

              <table className="kv" style={{ marginTop: 12 }}>
                <tbody>
                  <tr>
                    <th style={{ width: 150, verticalAlign: "top" }}>What moved</th>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {w.days
                          .filter((d) => d.summary)
                          .map((d) => (
                            <li key={d.work_date} style={{ marginBottom: 4 }}>
                              <strong style={{ color: "var(--ink)" }}>
                                {dayLabel(d.work_date).split(" ")[0]}
                              </strong>{" "}
                              — {d.summary}
                            </li>
                          ))}
                        {reported === 0 && (
                          <li style={{ color: "var(--muted)" }}>Nothing reported this week.</li>
                        )}
                      </ul>
                    </td>
                  </tr>

                  {blockers.length > 0 && (
                    <tr>
                      <th style={{ verticalAlign: "top" }}>What got in the way</th>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--err)" }}>
                          {blockers.map((d) => (
                            <li key={d.work_date} style={{ marginBottom: 4 }}>
                              <strong>{dayLabel(d.work_date).split(" ")[0]}</strong> — {d.blockers}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
    </>
  );
}

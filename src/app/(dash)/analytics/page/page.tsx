import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getHeatmap } from "@/lib/queries";
import ClickMap from "./click-map";

export default async function PageDetail({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; days?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const path = (sp.path ?? "").trim();
  const days = Number(sp.days) || 30;

  if (!path) {
    return (
      <>
        <div className="head">
          <h1>Page detail</h1>
        </div>
        <div className="msg err">No page chosen.</div>
      </>
    );
  }

  let data;
  try {
    data = await getHeatmap(path, days);
  } catch {
    return (
      <>
        <div className="head">
          <h1>{path}</h1>
        </div>
        <div className="msg err">Could not load this page&rsquo;s detail.</div>
      </>
    );
  }

  const totalVisits = data.depth.reduce((n, d) => n + d.visits, 0);

  // How many made it *at least* this far. Cumulative is the useful reading:
  // "40% never got past halfway" is actionable, a per-band count is not.
  const reached = (band: number) =>
    data.depth.filter((d) => d.band >= band).reduce((n, d) => n + d.visits, 0);

  const bands = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  let biggestDropAt = 0;
  let biggestDrop = 0;
  for (const b of bands) {
    const drop = reached(b) - reached(b + 10);
    if (drop > biggestDrop) {
      biggestDrop = drop;
      biggestDropAt = b;
    }
  }

  return (
    <>
      <div className="head">
        <h1>{path}</h1>
        <div className="spacer" />
        <Link href={`/analytics?days=${days}`} className="btn ghost">
          Back to traffic
        </Link>
      </div>

      {totalVisits === 0 ? (
        <div className="card">
          <p className="empty">No visits recorded for this page in the last {days} days.</p>
        </div>
      ) : (
        <>
          {biggestDrop > 0 && (
            <div className="msg warn">
              The biggest drop-off is between <strong>{biggestDropAt}%</strong> and{" "}
              <strong>{biggestDropAt + 10}%</strong> down the page —{" "}
              <strong>{biggestDrop}</strong> of {totalVisits} visits stopped there. That band is
              where the page is losing people.
            </div>
          )}

          <div className="grid2">
            <div className="card">
              <h2>Where people clicked</h2>
              <ClickMap points={data.points} />
            </div>

            <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
              <div className="card">
                <h2>How far down they got</h2>
                <table className="kv">
                  <tbody>
                    {bands.map((b) => {
                      const got = reached(b);
                      const pct = totalVisits ? Math.round((got / totalVisits) * 100) : 0;
                      return (
                        <tr key={b}>
                          <th>{b}%</th>
                          <td>
                            <div className="depth-bar">
                              <span style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td style={{ textAlign: "right", width: 70 }}>
                            <strong style={{ color: "var(--ink)" }}>{pct}%</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>Most clicked</h2>
                {data.elements.length === 0 ? (
                  <p className="empty" style={{ padding: "18px 0" }}>
                    No clicks recorded yet.
                  </p>
                ) : (
                  <table className="kv">
                    <tbody>
                      {data.elements.slice(0, 12).map((e, i) => (
                        <tr key={i}>
                          <th>
                            {e.label || <em style={{ color: "var(--muted)" }}>(no text)</em>}
                            <br />
                            <small style={{ color: "var(--muted)", fontWeight: 400 }}>
                              {e.selector}
                            </small>
                          </th>
                          <td style={{ textAlign: "right" }}>
                            <strong style={{ color: "var(--ink)" }}>{e.clicks}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

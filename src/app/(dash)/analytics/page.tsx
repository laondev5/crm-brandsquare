import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/queries";
import { humanSeconds } from "@/lib/types";
import TrafficChart from "./chart";

const RANGES = [7, 30, 90];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; site?: string }>;
}) {
  // Traffic is everyone's business — knowing which landing page works is not
  // an admin secret. Only the connection settings are restricted.
  await requireUser();

  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  // "all" is the default on purpose: a CRM covering several websites should
  // open on the whole picture, not on one of them.
  const site = sp.site === "this" || Number(sp.site) ? (sp.site as string) : "all";

  let data;
  try {
    data = await getAnalytics(days, site);
  } catch {
    return (
      <>
        <div className="head">
          <h1>Traffic</h1>
        </div>
        <div className="msg err">
          Could not load traffic. If the plugin was updated recently, visitor tracking may still be
          switched off under <strong>Brandsquare → Settings</strong>.
        </div>
      </>
    );
  }

  const t = data.totals;
  const noData = t.views === 0;
  const allSites = data.sites ?? [];
  const many = allSites.length > 1;
  const selected = site === "all" ? null : allSites.find((s) => s.key === site);
  const totalViews = allSites.reduce((n, s) => n + s.views, 0);

  const href = (over: { days?: number; site?: string }) => {
    const p = new URLSearchParams();
    p.set("days", String(over.days ?? days));
    const s = over.site ?? site;
    if (s !== "all") p.set("site", s);
    return `/analytics?${p}`;
  };

  return (
    <>
      <div className="head">
        <h1>Traffic</h1>
        <div className="spacer" />
        <div className="tabs" style={{ marginBottom: 0 }}>
          {RANGES.map((d) => (
            <Link key={d} href={href({ days: d })} className={d === days ? "on" : ""}>
              {d} days
            </Link>
          ))}
        </div>
      </div>

      {/* The website picker. Sites with no traffic are still listed — being
          able to see that a connected site is sending nothing is the point. */}
      {many && (
        <div className="sitebar">
          <Link href={href({ site: "all" })} className={site === "all" ? "on" : ""}>
            <b>All websites</b>
            <span>{totalViews.toLocaleString()} views</span>
          </Link>
          {allSites.map((s) => (
            <Link key={s.key} href={href({ site: s.key })} className={site === s.key ? "on" : ""}>
              <b>{s.name}</b>
              <span>
                {s.views ? (
                  <>
                    {s.views.toLocaleString()} views · {s.conversions} enquiries
                  </>
                ) : (
                  "no traffic yet"
                )}
              </span>
            </Link>
          ))}
        </div>
      )}

      {selected && selected.views === 0 && (
        <div className="msg warn">
          <strong>{selected.name}</strong> has sent no traffic in the last {days} days. On that
          website, open <strong>Brandsquare → Settings</strong>, check that visitor tracking is on
          and that it is set to send to this CRM, then press{" "}
          <strong>Send everything to the CRM now</strong>. Traffic is sent every 15 minutes, and
          your own visits are never counted while you are signed in to WordPress there.
        </div>
      )}

      {noData ? (
        <div className="card">
          <p className="empty">
            Nothing recorded yet. Visitor tracking starts the moment the plugin is installed and
            switched on — check <strong>Brandsquare → Settings</strong>, then come back once the
            site has had some visitors.
          </p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat t-total">
              <span>Page views</span>
              <b>{t.views.toLocaleString()}</b>
            </div>
            <div className="stat t-open">
              <span>Visitors</span>
              <b>{t.visitors.toLocaleString()}</b>
            </div>
            <div className="stat t-won">
              <span>Enquiries</span>
              <b>{t.conversions.toLocaleString()}</b>
            </div>
            <div className="stat t-today">
              <span>Conversion</span>
              <b>{t.rate}%</b>
            </div>
            <div className="stat t-quiet">
              <span>Avg time on page</span>
              <b>{humanSeconds(t.avg_seconds)}</b>
            </div>
            <div className="stat t-total">
              <span>Avg scroll depth</span>
              <b>{t.avg_scroll}%</b>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h2>Visitors and enquiries{selected ? ` — ${selected.name}` : ""}</h2>
            <TrafficChart daily={data.daily} />
          </div>

          <div className="grid2">
            <div className="card" style={{ padding: "6px 8px" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th style={{ width: 80 }}>Views</th>
                    <th style={{ width: 90 }}>Time</th>
                    <th style={{ width: 80 }}>Scroll</th>
                    <th style={{ width: 90 }}>Left fast</th>
                    <th style={{ width: 110 }}>Enquiries</th>
                    <th style={{ width: 70 }} />
                  </tr>
                </thead>
                <tbody>
                  {data.pages.map((p) => (
                    <tr key={`${p.site_id ?? 0}:${p.path}`}>
                      <td data-l="Page">
                        <strong style={{ color: "var(--ink)" }}>{p.path}</strong>
                        {/* Which website this page belongs to, when more than
                            one is in view — two sites can both have a "/". */}
                        {site === "all" && many && <span className="pill p-site">{p.site}</span>}
                        {p.title && (
                          <>
                            <br />
                            <small style={{ color: "var(--muted)" }}>{p.title}</small>
                          </>
                        )}
                      </td>
                      <td data-l="Views">{p.views.toLocaleString()}</td>
                      <td data-l="Time">{humanSeconds(p.avg_seconds)}</td>
                      <td data-l="Scroll">
                        {/* Average depth as a bar: the number alone does not
                            show how far short of the page it stops. */}
                        <div className="depth-bar" title={`${p.avg_scroll}% average depth`}>
                          <span style={{ width: `${p.avg_scroll}%` }} />
                        </div>
                        <small>{p.avg_scroll}%</small>
                      </td>
                      <td data-l="Left fast">
                        <span style={{ color: p.bounce_rate > 60 ? "var(--err)" : undefined }}>
                          {p.bounce_rate}%
                        </span>
                      </td>
                      <td data-l="Enquiries">
                        <strong style={{ color: "var(--ink)" }}>{p.conversions}</strong>
                        <span style={{ color: "var(--muted)" }}> · {p.rate}%</span>
                      </td>
                      <td>
                        <Link
                          href={`/analytics/page?path=${encodeURIComponent(p.path)}&days=${days}&site=${
                            p.site_id ?? "this"
                          }`}
                          className="btn ghost sm"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
              <div className="card">
                <h2>Where they came from</h2>
                {data.sources.length === 0 ? (
                  <p className="empty" style={{ padding: "18px 0" }}>
                    No campaign data yet.
                  </p>
                ) : (
                  <table className="kv">
                    <tbody>
                      {data.sources.map((s, i) => (
                        <tr key={i}>
                          <th>
                            {s.source}
                            {s.campaign && (
                              <>
                                <br />
                                <small style={{ color: "var(--muted)", fontWeight: 400 }}>
                                  {s.campaign}
                                </small>
                              </>
                            )}
                          </th>
                          <td style={{ textAlign: "right" }}>
                            <strong style={{ color: "var(--ink)" }}>{s.views}</strong> views
                            <br />
                            <small style={{ color: s.conversions ? "var(--ok)" : "var(--muted)" }}>
                              {s.conversions} enquiries · {s.rate}%
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Phone versus desktop, with how far each gets and how many
                  leave straight away — the two numbers that say whether the
                  site actually works on a phone, rather than just how many
                  people arrived on one. */}
              <div className="card">
                <h2>Phone, tablet or desktop</h2>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th style={{ width: 60 }}>Views</th>
                      <th style={{ width: 70 }}>Scroll</th>
                      <th style={{ width: 80 }}>Left fast</th>
                      <th style={{ width: 90 }}>Enquiries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.devices.map((d) => (
                      <tr key={d.device}>
                        <td data-l="Device" style={{ textTransform: "capitalize" }}>
                          <strong style={{ color: "var(--ink)" }}>{d.device || "unknown"}</strong>
                        </td>
                        <td data-l="Views">{d.views.toLocaleString()}</td>
                        <td data-l="Scroll">
                          <div className="depth-bar" title={`${d.avg_scroll}% average depth`}>
                            <span style={{ width: `${d.avg_scroll}%` }} />
                          </div>
                          <small>{d.avg_scroll}%</small>
                        </td>
                        <td data-l="Left fast">
                          <span style={{ color: d.bounce_rate > 60 ? "var(--err)" : undefined }}>
                            {d.bounce_rate}%
                          </span>
                        </td>
                        <td data-l="Enquiries">
                          <strong style={{ color: "var(--ink)" }}>{d.conversions}</strong>
                          <span style={{ color: "var(--muted)" }}> · {d.rate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

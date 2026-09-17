import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBlogger } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getBlogPostAnalytics } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import { fmtDate, SeoBadge, seconds, StatusChip, ViewsChart } from "../../bits";

const RANGES = [7, 30, 90, 365];

function Bars({ rows }: { rows: { label: string; views: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  if (!rows.length) return <p className="empty" style={{ padding: "10px 0" }}>Nothing yet.</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ textTransform: "capitalize" }}>{r.label}</span>
            <strong>{r.views.toLocaleString()}</strong>
          </div>
          <div style={{ height: 6, background: "#eceef3", borderRadius: 3, marginTop: 3 }}>
            <div style={{ width: `${(r.views / max) * 100}%`, height: "100%", background: "var(--p)", borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function PostAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const me = await requireBlogger();
  const { id } = await params;
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;

  let data;
  try {
    data = await getBlogPostAnalytics(me, Number(id), days);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return <div className="msg err">Could not load this post&rsquo;s analytics.</div>;
  }
  const { post, totals: t } = data;

  return (
    <>
      <div className="head">
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {post.title}
          <StatusChip status={post.status} />
        </h1>
        <div className="spacer" />
        <Link href={`/blog/${post.id}`} className="btn ghost">
          Edit post
        </Link>
        {post.link && (
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="btn ghost">
            View on site ↗
          </a>
        )}
        <div className="tabs" style={{ marginBottom: 0, width: "100%" }}>
          {RANGES.map((d) => (
            <Link key={d} href={`/blog/${post.id}/analytics?days=${d}`} className={d === days ? "on" : ""}>
              {d === 365 ? "1 year" : `${d} days`}
            </Link>
          ))}
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -6 }}>
        Published {fmtDate(post.date)} by {post.author_name} · {post.categories.map((c) => c.name).join(", ") || "Uncategorised"} ·{" "}
        <SeoBadge score={post.seo_score} keyword={post.focus_keyword} />
      </p>

      {post.status !== "publish" ? (
        <div className="msg warn">This post is not published, so there is nothing to measure yet.</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat t-total"><span>Views</span><b>{t.views.toLocaleString()}</b></div>
            <div className="stat t-open"><span>Readers</span><b>{t.visitors.toLocaleString()}</b></div>
            <div className="stat t-quiet"><span>Avg time reading</span><b>{seconds(t.avg_seconds)}</b></div>
            <div className="stat t-total"><span>Avg scroll depth</span><b>{t.avg_scroll}%</b></div>
            <div className="stat t-won"><span>Enquiries</span><b>{t.leads}</b></div>
            <div className="stat t-today"><span>Views all time</span><b>{t.all_time_views.toLocaleString()}</b></div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h2>Views over time</h2>
            <ViewsChart series={data.series} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            <div className="card">
              <h2>Where readers came from</h2>
              <Bars rows={data.sources} />
            </div>
            <div className="card">
              <h2>Devices</h2>
              <Bars rows={data.devices} />
            </div>
            <div className="card">
              <h2>Enquiries from this post</h2>
              {data.leads.length === 0 ? (
                <p className="empty" style={{ padding: "10px 0" }}>
                  No enquiries came from this page in this period.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  {data.leads.map((l) => (
                    <li key={l.id} style={{ fontSize: 13 }}>
                      {isAdminRole(me.role) ? (
                        <Link href={`/leads/${l.id}`} style={{ color: "var(--p)", fontWeight: 600 }}>
                          {l.name || l.email || `Lead #${l.id}`}
                        </Link>
                      ) : (
                        <strong>{l.name || "A reader"}</strong>
                      )}
                      <small style={{ color: "var(--muted)", display: "block" }}>{fmtDate(l.created_at, true)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

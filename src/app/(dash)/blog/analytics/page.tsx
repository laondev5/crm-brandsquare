import Link from "next/link";
import { requireBlogger } from "@/lib/auth";
import { getBlogAnalytics } from "@/lib/queries";
import { fmtDate, SeoBadge, seconds, ViewsChart } from "../bits";

const RANGES = [7, 30, 90, 365];

/**
 * How the blog is performing, for authors and admins alike: views over time,
 * then every published post ranked by readers, with how long they stayed, how
 * far they scrolled, and the enquiries that came from the page.
 */
export default async function BlogAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const me = await requireBlogger();
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;

  let data;
  try {
    data = await getBlogAnalytics(me, days);
  } catch {
    return <div className="msg err">Could not load blog analytics. The WordPress plugin needs to be version 1.24.0 or newer.</div>;
  }
  const t = data.totals;

  return (
    <>
      <div className="head">
        <h1>Blog analytics</h1>
        <div className="spacer" />
        <div className="tabs" style={{ marginBottom: 0 }}>
          {RANGES.map((d) => (
            <Link key={d} href={`/blog/analytics?days=${d}`} className={d === days ? "on" : ""}>
              {d === 365 ? "1 year" : `${d} days`}
            </Link>
          ))}
        </div>
      </div>

      <div className="stats">
        <div className="stat t-total"><span>Views</span><b>{t.views.toLocaleString()}</b></div>
        <div className="stat t-open"><span>Readers</span><b>{t.visitors.toLocaleString()}</b></div>
        <div className="stat t-quiet"><span>Avg time reading</span><b>{seconds(t.avg_seconds)}</b></div>
        <div className="stat t-total"><span>Avg scroll depth</span><b>{t.avg_scroll}%</b></div>
        <div className="stat t-won"><span>Enquiries from posts</span><b>{t.leads.toLocaleString()}</b></div>
        <div className="stat t-today"><span>Published posts</span><b>{t.posts.toLocaleString()}</b></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Views over the last {days === 365 ? "year" : `${days} days`}</h2>
        <ViewsChart series={data.series} />
      </div>

      <div className="card" style={{ padding: "6px 8px" }}>
        <h2 style={{ padding: "10px 10px 0" }}>Posts by readership</h2>
        {data.posts.length === 0 ? (
          <p className="empty">No published posts yet.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Post</th>
                <th style={{ width: 80 }}>Views</th>
                <th style={{ width: 80 }}>Readers</th>
                <th style={{ width: 95 }}>Avg time</th>
                <th style={{ width: 80 }}>Scroll</th>
                <th style={{ width: 80 }}>Leads</th>
                <th style={{ width: 100 }}>SEO</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map((p, i) => (
                <tr key={p.id}>
                  <td data-l="#" style={{ color: "var(--muted)" }}>{i + 1}</td>
                  <td data-l="Post">
                    <Link href={`/blog/${p.id}/analytics`} className="name">
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {fmtDate(p.date)} · {p.author_name}
                    </div>
                  </td>
                  <td data-l="Views">{p.views.toLocaleString()}</td>
                  <td data-l="Readers">{p.visitors.toLocaleString()}</td>
                  <td data-l="Avg time">{p.views ? seconds(p.avg_seconds) : "—"}</td>
                  <td data-l="Scroll">{p.views ? `${p.avg_scroll}%` : "—"}</td>
                  <td data-l="Leads">{p.leads}</td>
                  <td data-l="SEO">
                    <SeoBadge score={p.seo_score} keyword={p.focus_keyword} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>
        Counted from brandsquare.shop&rsquo;s own visitor tracking, the same numbers as the Traffic
        screens. Visits by people signed in to WordPress are not counted.
      </p>
    </>
  );
}

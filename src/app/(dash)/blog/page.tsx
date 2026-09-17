import Link from "next/link";
import { requireBlogger } from "@/lib/auth";
import { listBlogCategories, listBlogPosts } from "@/lib/queries";
import { fmtDate, SeoBadge, StatusChip } from "./bits";

const TABS = [
  { key: "", label: "All" },
  { key: "publish", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "future", label: "Scheduled" },
  { key: "pending", label: "Pending review" },
];

/**
 * Every post on brandsquare.shop, managed from here — no WordPress login.
 * Views are the last 30 days from the site's own visit log, so the list shows
 * what is being read, not just what exists.
 */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; s?: string; page?: string; category?: string }>;
}) {
  const me = await requireBlogger();
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? (sp.status ?? "") : "";

  let data;
  let cats;
  try {
    [data, cats] = await Promise.all([
      listBlogPosts(me, {
        status: status || undefined,
        search: sp.s,
        page: Number(sp.page) || 1,
        category: Number(sp.category) || undefined,
      }),
      listBlogCategories(me),
    ]);
  } catch {
    return (
      <>
        <div className="head">
          <h1>Blog</h1>
        </div>
        <div className="msg err">
          Could not load the blog. The WordPress plugin needs to be version 1.24.0 or newer.
        </div>
      </>
    );
  }

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ status: status || undefined, s: sp.s, category: sp.category, ...over }).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const str = p.toString();
    return str ? `/blog?${str}` : "/blog";
  };
  const allCount = Object.values(data.by_status).reduce((n, x) => n + x, 0);

  return (
    <>
      <div className="head">
        <h1>Blog posts</h1>
        <div className="spacer" />
        <Link href="/blog/analytics" className="btn ghost">
          Analytics
        </Link>
        <Link href="/blog/new" className="btn">
          + New post
        </Link>
        <form className="row" action="/blog" style={{ width: "100%" }}>
          {status && <input type="hidden" name="status" value={status} />}
          <select name="category" defaultValue={sp.category ?? ""} style={{ width: 200 }}>
            <option value="">All categories</option>
            {cats.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
          <input type="search" name="s" defaultValue={sp.s ?? ""} placeholder="Search posts…" style={{ width: 260 }} />
          <button className="btn ghost">Search</button>
        </form>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t.key || "all"} href={qs({ status: t.key || undefined, page: undefined })} className={status === t.key ? "on" : ""}>
            {t.label} ({t.key ? (data.by_status[t.key] ?? 0) : allCount})
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: "6px 8px" }}>
        {data.posts.length === 0 ? (
          <p className="empty">
            {sp.s || sp.category || status ? "No posts match." : "No posts yet. Write the first one."}
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Title</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 160 }}>Category</th>
                <th style={{ width: 140 }}>Author</th>
                <th style={{ width: 110 }}>SEO</th>
                <th style={{ width: 90 }}>Views (30d)</th>
                <th style={{ width: 120 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map((p) => (
                <tr key={p.id}>
                  <td data-l="Title">
                    <Link href={`/blog/${p.id}`} className="name">
                      {p.title || "(no title)"}
                    </Link>
                    <div style={{ fontSize: 12, marginTop: 2, display: "flex", gap: 10 }}>
                      <Link href={`/blog/${p.id}`} style={{ color: "var(--p)" }}>
                        Edit
                      </Link>
                      {p.status === "publish" && (
                        <Link href={`/blog/${p.id}/analytics`} style={{ color: "var(--p)" }}>
                          Analytics
                        </Link>
                      )}
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)" }}>
                          View ↗
                        </a>
                      )}
                    </div>
                  </td>
                  <td data-l="Status">
                    <StatusChip status={p.status} />
                  </td>
                  <td data-l="Category" style={{ fontSize: 13 }}>
                    {p.categories.map((c) => c.name).join(", ") || "—"}
                  </td>
                  <td data-l="Author" style={{ fontSize: 13 }}>
                    {p.author_name || "—"}
                  </td>
                  <td data-l="SEO">
                    <SeoBadge score={p.seo_score} keyword={p.focus_keyword} />
                  </td>
                  <td data-l="Views (30d)">{p.status === "publish" ? (p.views ?? 0).toLocaleString() : "—"}</td>
                  <td data-l="Date" style={{ fontSize: 13 }}>
                    {fmtDate(p.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.pages > 1 && (
        <div className="row" style={{ marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={qs({ page: String(n) })} className={`btn ${n === data.page ? "" : "ghost"}`}>
              {n}
            </Link>
          ))}
        </div>
      )}
      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 14 }}>
        {data.total} post{data.total === 1 ? "" : "s"}
      </p>
    </>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPipeline, listCampaigns, listLeads } from "@/lib/queries";
import { daysQuiet, isStale } from "@/lib/types";
import StatusPill from "../pill";
import QuietFor from "./quiet-for";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; s?: string; form?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireUser();
  const scope = me.role === "admin" ? null : me.id;
  const formId = Number(sp.form) || null;

  const [{ rows, total, pages, page, stale_after_days, now }, campaigns, pipeline] = await Promise.all([
    listLeads({
      status: sp.status,
      search: sp.s,
      ownerId: scope,
      formId,
      page: Number(sp.page) || 1,
    }),
    // Sub-admins get the picker too — it only names campaigns, and their
    // results stay scoped to their own leads by the server.
    listCampaigns(1, 100).then((r) => r.rows).catch(() => []),
    getPipeline(),
  ]);

  // The stage tabs come from the configured pipeline, so a stage added in
  // WordPress shows up here without a deploy.
  const TABS = [
    { key: "", label: "All" },
    { key: "open", label: "Open" },
    { key: "unassigned", label: "Unassigned" },
    { key: "overdue", label: "Overdue" },
    { key: "stale", label: "Stale" },
    ...pipeline.stages.map((s) => ({ key: s.key, label: s.label })),
  ];

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: sp.status, s: sp.s, form: sp.form, ...over };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const str = p.toString();
    return str ? `/leads?${str}` : "/leads";
  };

  const active = campaigns.find((c) => c.id === formId);

  return (
    <>
      <div className="head">
        <h1>{me.role === "admin" ? "Leads" : "My leads"}</h1>
        <div className="spacer" />
        <Link href="/leads/import" className="btn ghost">
          Import
        </Link>
        <Link href="/leads/new" className="btn">
          Add lead
        </Link>
        <form className="row" action="/leads" style={{ width: "100%" }}>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <select name="form" defaultValue={sp.form ?? ""} style={{ width: 190 }}>
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="s"
            defaultValue={sp.s ?? ""}
            placeholder="Search name, email, phone, answers…"
            style={{ width: 260 }}
          />
          <button className="btn ghost">Search</button>
        </form>
      </div>

      <div className="tabs">
        {TABS.map((tb) => (
          <Link
            key={tb.key || "all"}
            href={qs({ status: tb.key || undefined, page: undefined })}
            className={(sp.status ?? "") === tb.key ? "on" : ""}
          >
            {tb.label}
          </Link>
        ))}
      </div>

      {sp.status === "stale" && (
        <div className="msg warn">
          {stale_after_days > 0 ? (
            <>
              Open leads with nothing on their timeline for over{" "}
              <strong>{stale_after_days} days</strong> — no note, email, WhatsApp or stage change.
              Longest silent first. Won and lost leads are never listed here.
            </>
          ) : (
            <>
              Stale flagging is switched off. Set a number of days under{" "}
              <strong>Brandsquare → Settings</strong> in WordPress to turn it on.
            </>
          )}
        </div>
      )}

      {active && (
        <div className="msg ok" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>
            Showing leads from <strong>{active.name}</strong>
          </span>
          <Link href={qs({ form: undefined, page: undefined })} style={{ fontWeight: 600 }}>
            Clear
          </Link>
        </div>
      )}

      <div className="card" style={{ padding: "6px 8px" }}>
        {rows.length === 0 ? (
          <p className="empty">No leads match this view.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th style={{ width: 130 }}>Phone</th>
                <th style={{ width: 160 }}>Campaign</th>
                <th style={{ width: 105 }}>Stage</th>
                <th style={{ width: 130 }}>Owner</th>
                <th style={{ width: 120 }}>
                  {sp.status === "stale" ? "Last activity" : "Received"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td data-l="ID">#{l.id}</td>
                  <td data-l="Name">
                    <Link href={`/leads/${l.id}`} className="name">
                      {l.name || "(no name)"}
                    </Link>
                    {isStale(l, now, stale_after_days) && (
                      <QuietFor days={daysQuiet(l.last_activity_at, now)} />
                    )}
                  </td>
                  <td data-l="Email">{l.email || "—"}</td>
                  <td data-l="Phone">{l.phone || "—"}</td>
                  <td data-l="Campaign">
                    {l.form_name ? (
                      me.role === "admin" && l.form_id ? (
                        <Link href={`/campaigns/${l.form_id}`} style={{ color: "var(--p)", fontWeight: 600 }}>
                          {l.form_name}
                        </Link>
                      ) : (
                        l.form_name
                      )
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td data-l="Stage">
                    <StatusPill status={l.status} pipeline={pipeline} />
                  </td>
                  <td data-l="Owner">{l.owner ?? "Unassigned"}</td>
                  <td data-l={sp.status === "stale" ? "Last activity" : "Received"}>
                    {sp.status === "stale"
                      ? l.last_activity_at
                        ? fmt(l.last_activity_at)
                        : "—"
                      : fmt(l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="row" style={{ marginTop: 16, justifyContent: "center" }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={qs({ page: String(n) })} className={`btn ${n === page ? "" : "ghost"}`}>
              {n}
            </Link>
          ))}
        </div>
      )}

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 14 }}>
        {total} lead{total === 1 ? "" : "s"}
      </p>
    </>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

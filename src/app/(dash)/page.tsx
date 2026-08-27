import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCampaigns, listLeads, metrics } from "@/lib/queries";
import { LEAD_STATUSES } from "@/lib/types";
import StatusPill from "./pill";

export default async function Overview() {
  const me = await requireUser();
  const scope = me.role === "admin" ? null : me.id;

  const [m, recent, campaigns] = await Promise.all([
    metrics(scope),
    listLeads({ ownerId: scope, perPage: 8 }),
    me.role === "admin"
      ? listCampaigns(1, 100).then((r) => r.rows).catch(() => [])
      : Promise.resolve([]),
  ]);
  const load = me.role === "admin" ? m.load : [];
  const topCampaigns = [...campaigns].sort((a, b) => b.leads - a.leads).slice(0, 5);

  return (
    <>
      <div className="head">
        <h1>Dashboard</h1>
        <div className="spacer" />
        <Link href="/leads" className="btn ghost">
          View all leads
        </Link>
      </div>

      <div className="stats">
        <div className="stat t-total">
          <span>Total leads</span>
          <b>{m.total}</b>
        </div>
        <div className="stat t-today">
          <span>New today</span>
          <b>{m.today}</b>
        </div>
        <Link href="/leads?status=open" className="stat t-open">
          <span>Open</span>
          <b>
            {(m.byStatus.new ?? 0) +
              (m.byStatus.assigned ?? 0) +
              (m.byStatus.contacted ?? 0) +
              (m.byStatus.qualified ?? 0)}
          </b>
        </Link>
        <Link
          href="/leads?status=overdue"
          className={`stat t-overdue${m.overdue ? " is-alert" : ""}`}
        >
          <span>Overdue follow-up</span>
          <b>{m.overdue}</b>
        </Link>
        {m.stale_after_days > 0 && (
          <Link
            href="/leads?status=stale"
            className={`stat t-quiet${m.stale ? " is-alert" : ""}`}
          >
            <span>Gone quiet</span>
            <b>{m.stale}</b>
          </Link>
        )}
        <div className="stat t-won">
          <span>Conversion</span>
          <b>{m.conversion}%</b>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Recent leads</h2>
          {recent.rows.length === 0 ? (
            <p className="empty">No leads yet. They appear here the moment the website form is submitted.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Campaign</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {recent.rows.map((l) => (
                  <tr key={l.id}>
                    <td data-l="Name">
                      <Link href={`/leads/${l.id}`} className="name">
                        {l.name || "(no name)"}
                      </Link>
                    </td>
                    <td data-l="Contact">{l.email || l.phone || "—"}</td>
                    <td data-l="Campaign">
                      {l.form_name ?? <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <td data-l="Stage">
                      <StatusPill status={l.status} />
                    </td>
                    <td data-l="Owner">{l.owner ?? "Unassigned"}</td>
                    <td data-l="Received">{fmt(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <h2>Pipeline</h2>
            <table className="kv">
              <tbody>
                {LEAD_STATUSES.map((s) => (
                  <tr key={s.key}>
                    <th>{s.label}</th>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--ink)" }}>
                      {m.byStatus[s.key] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {me.role === "admin" && (
            <div className="card">
              <h2>Top campaigns</h2>
              {topCampaigns.length === 0 ? (
                <p className="empty" style={{ padding: "18px 0" }}>
                  No campaign forms yet.
                </p>
              ) : (
                <table className="kv">
                  <tbody>
                    {topCampaigns.map((c) => (
                      <tr key={c.id}>
                        <th>
                          <Link href={`/campaigns/${c.id}`} style={{ color: "var(--ink)" }}>
                            {c.name}
                          </Link>
                        </th>
                        <td style={{ textAlign: "right" }}>
                          <strong style={{ color: "var(--ink)" }}>{c.leads}</strong> leads
                          {c.leads > 0 && (
                            <span style={{ color: "var(--muted)" }}> · {c.conversion}%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {me.role === "admin" && (
            <div className="card">
              <h2>Team load</h2>
              {load.length === 0 ? (
                <p className="empty" style={{ padding: "18px 0" }}>
                  No active sub-admins yet.
                </p>
              ) : (
                <table className="kv">
                  <tbody>
                    {load.map((u) => (
                      <tr key={u.id}>
                        <th>{u.name}</th>
                        <td style={{ textAlign: "right" }}>
                          <strong style={{ color: "var(--ink)" }}>{Number(u.open_leads) || 0}</strong> open
                          <span style={{ color: "var(--muted)" }}> · {Number(u.won) || 0} won</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

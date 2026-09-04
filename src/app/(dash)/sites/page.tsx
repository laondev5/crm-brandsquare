import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { listSites } from "@/lib/queries";
import AddSite from "./add-site";
import SiteRow from "./row";

export default async function SitesPage() {
  const me = await requireSuperAdmin();
  const { sites, this_site } = await listSites(me);

  const live = sites.filter((s) => s.status === "active").length;
  const totalLeads = sites.reduce((n, s) => n + s.leads, 0) + this_site.leads;

  return (
    <>
      <div className="head">
        <h1>Websites</h1>
        <div className="spacer" />
        <span className="board-legend">
          <b>{live + 1}</b> live · <b>{totalLeads}</b> leads
        </span>
      </div>

      <p className="board-hint">
        Every website that feeds this CRM. Add one here, then paste what it gives you into that
        site&rsquo;s WordPress settings — its enquiries start arriving alongside everything else.
      </p>

      <div className="stats">
        <div className="stat t-total">
          <span>Websites</span>
          <b>{live + 1}</b>
        </div>
        <div className="stat t-open">
          <span>Leads from all sites</span>
          <b>{totalLeads}</b>
        </div>
        <div className="stat t-today">
          <span>From this site</span>
          <b>{this_site.leads}</b>
        </div>
      </div>

      <div className="card" style={{ padding: "6px 8px", marginBottom: 20 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Website</th>
              <th style={{ width: 120 }}>Leads</th>
              <th style={{ width: 150 }}>Last received</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 170 }} />
            </tr>
          </thead>
          <tbody>
            {/* The CRM's own site is listed first and cannot be removed — it is
                not a connection, it is where everything lives. */}
            <tr>
              <td data-l="Website">
                <strong style={{ color: "var(--ink)" }}>{this_site.name}</strong>
                <br />
                <small style={{ color: "var(--muted)" }}>{this_site.url}</small>
              </td>
              <td data-l="Leads">
                <Link href="/leads?site=this" className="name">
                  {this_site.leads}
                </Link>
              </td>
              <td data-l="Last received">—</td>
              <td data-l="Status">
                <span className="pill s-active">This CRM</span>
              </td>
              <td />
            </tr>

            {sites.map((s) => (
              <SiteRow key={s.id} site={s} />
            ))}
          </tbody>
        </table>
      </div>

      <AddSite />
    </>
  );
}

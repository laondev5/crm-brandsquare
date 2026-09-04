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
  const totalViews = sites.reduce((n, s) => n + s.views, 0) + this_site.views;
  // A connected site that has sent leads but no traffic is the one failure
  // worth naming outright: it means the tracking half is not reporting.
  const quiet = sites.filter((s) => s.status === "active" && s.views === 0);

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
        <div className="stat t-won">
          <span>Pageviews from all sites</span>
          <b>{totalViews.toLocaleString()}</b>
        </div>
      </div>

      {quiet.length > 0 && (
        <div className="msg warn">
          {quiet.map((s) => s.name).join(", ")}{" "}
          {quiet.length === 1 ? "has" : "have"} sent no traffic yet. On that website open{" "}
          <strong>Brandsquare → Settings</strong>, switch on <strong>Visitor tracking</strong>,
          confirm the CRM address and key, then press{" "}
          <strong>Send everything to the CRM now</strong>. Traffic is sent every 15 minutes, and
          your own visits are not counted while you are signed in to WordPress there.
        </div>
      )}

      <div className="card" style={{ padding: "6px 8px", marginBottom: 20 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Website</th>
              <th style={{ width: 100 }}>Leads</th>
              <th style={{ width: 120 }}>Traffic</th>
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
              <td data-l="Traffic">
                <Link href="/analytics?site=this" className="name">
                  {this_site.views.toLocaleString()}
                </Link>
              </td>
              <td data-l="Last received">
                {this_site.last_visit ? (
                  fmtDate(this_site.last_visit)
                ) : (
                  <span style={{ color: "var(--muted)" }}>No visits yet</span>
                )}
              </td>
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

function fmtDate(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

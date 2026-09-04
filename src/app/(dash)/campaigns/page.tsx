import Link from "next/link";
import { isAdminRole } from "@/lib/types";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listCampaigns } from "@/lib/queries";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await currentUser();
  if (!me) redirect("/login");
  // Campaign totals span every lead, including ones a sub-admin doesn't own,
  // so this stays admin-only. They still see the campaign on their own leads.
  if (!isAdminRole(me.role)) redirect("/leads");

  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const { rows, total, pages } = await listCampaigns(page);

  const totalLeads = rows.reduce((n, c) => n + c.leads, 0);

  return (
    <>
      <div className="head">
        <h1>Campaigns</h1>
        <div className="spacer" />
        <Link href="/leads/new" className="btn ghost">
          Add lead
        </Link>
        <Link href="/leads/import" className="btn">
          Import leads
        </Link>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Campaigns</span>
          <b>{total}</b>
        </div>
        <div className="stat accent">
          <span>Leads on this page</span>
          <b>{totalLeads}</b>
        </div>
        <div className="stat">
          <span>Active</span>
          <b>{rows.filter((c) => c.status === "active").length}</b>
        </div>
      </div>

      <div className="card" style={{ padding: "6px 8px" }}>
        {rows.length === 0 ? (
          <p className="empty">
            No campaign forms yet. Create one in WordPress under Brandsquare → Forms.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Campaign</th>
                <th style={{ width: 110 }}>Type</th>
                <th style={{ width: 80 }}>Leads</th>
                <th style={{ width: 70 }}>Won</th>
                <th style={{ width: 110 }}>Conversion</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 120 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td data-l="ID">#{c.id}</td>
                  <td data-l="Campaign">
                    <Link href={`/campaigns/${c.id}`} className="name">
                      {c.name}
                    </Link>
                  </td>
                  <td data-l="Type">{modeLabel(c.mode)}</td>
                  <td data-l="Leads">
                    <strong style={{ color: "var(--ink)" }}>{c.leads}</strong>
                  </td>
                  <td data-l="Won">{c.won}</td>
                  <td data-l="Conversion">{c.leads ? `${c.conversion}%` : "—"}</td>
                  <td data-l="Status">
                    <span className={`pill s-${c.status === "active" ? "active" : "disabled"}`}>
                      {c.status === "active" ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td data-l="Created">{fmt(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="row" style={{ marginTop: 16, justifyContent: "center" }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`/campaigns?page=${n}`} className={`btn ${n === page ? "" : "ghost"}`}>
              {n}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function modeLabel(mode: string) {
  if (mode === "manual") return "Manually added";
  return mode === "modal" ? "Popup modal" : "Inline";
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

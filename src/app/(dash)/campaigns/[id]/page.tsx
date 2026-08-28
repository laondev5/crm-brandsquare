import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCampaign, getPipeline, listLeads } from "@/lib/queries";

import StatusPill from "../../pill";

export default async function CampaignDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/leads");

  const { id: raw } = await params;
  const id = Number(raw);
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [{ rows, total, pages }, pipeline] = await Promise.all([
    listLeads({ formId: id, page }),
    getPipeline(),
  ]);

  return (
    <>
      <div className="head">
        <h1>{campaign.name}</h1>
        <span className={`pill s-${campaign.status === "active" ? "active" : "disabled"}`}>
          {campaign.status === "active" ? "Active" : "Archived"}
        </span>
        <div className="spacer" />
        <Link href="/campaigns" className="btn ghost">
          All campaigns
        </Link>
      </div>

      <div className="stats">
        <div className="stat accent">
          <span>Leads captured</span>
          <b>{campaign.leads}</b>
        </div>
        <div className="stat">
          <span>Won</span>
          <b>{campaign.won}</b>
        </div>
        <div className="stat">
          <span>Conversion</span>
          <b>{campaign.leads ? `${campaign.conversion}%` : "—"}</b>
        </div>
        <div className="stat">
          <span>Form type</span>
          <b style={{ fontSize: 17 }}>
            {campaign.mode === "manual" ? "Manually added" : campaign.mode === "modal" ? "Popup modal" : "Inline"}
          </b>
        </div>
      </div>

      <div className="grid2">
        <div className="card" style={{ padding: "6px 8px" }}>
          {rows.length === 0 ? (
            <p className="empty">No leads from this campaign yet.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ width: 110 }}>Stage</th>
                  <th style={{ width: 130 }}>Owner</th>
                  <th style={{ width: 120 }}>Received</th>
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
                    </td>
                    <td data-l="Email">{l.email || "—"}</td>
                    <td data-l="Stage">
                      <StatusPill status={l.status} pipeline={pipeline} />
                    </td>
                    <td data-l="Owner">{l.owner ?? "Unassigned"}</td>
                    <td data-l="Received">{fmt(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pages > 1 && (
            <div className="row" style={{ margin: "14px 0", justifyContent: "center" }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`/campaigns/${id}?page=${n}`}
                  className={`btn ${n === page ? "" : "ghost"}`}
                >
                  {n}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <h2>Pipeline</h2>
            <table className="kv">
              <tbody>
                {pipeline.stages.map((s) => (
                  <tr key={s.key}>
                    <th>{s.label}</th>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--ink)" }}>
                      {campaign.byStatus[s.key] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Questions asked</h2>
            <table className="kv">
              <tbody>
                {campaign.fields.map((f) => (
                  <tr key={f.key}>
                    <th>{f.label}</th>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{f.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 0" }}>
              Leads keep the wording they were asked, so editing this form later never rewrites
              answers already captured.
            </p>
          </div>
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16 }}>
        {total} lead{total === 1 ? "" : "s"} from this campaign.{" "}
        <Link href={`/leads?form=${id}`} style={{ color: "var(--p)", fontWeight: 600 }}>
          Open in Leads
        </Link>
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

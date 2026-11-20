import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getDeal,
  getDocSettings,
  getPipeline,
  listLeads,
  listOrganizations,
  teamPeople,
} from "@/lib/queries";
import { hasPermission, isAdminRole, money } from "@/lib/types";
import DealForm from "../form";
import DealNotes from "./notes";
import TaskMini from "../../task-mini";
import DeleteDocument from "../../delete-document";
import RecordTabs, { type RecordPanel } from "../../record-tabs";

const DOC_HREF: Record<string, string> = {
  quotation: "quotes",
  invoice: "invoices",
  receipt: "receipts",
};

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const dealId = Number(id);
  if (!dealId) notFound();

  const deal = await getDeal(me, dealId)
    .then((r) => r.deal)
    .catch(() => null);
  if (!deal) notFound();

  const admin = isAdminRole(me.role);
  const canWrite =
    admin ||
    (me.role === "subadmin" &&
      hasPermission(me, "add_leads") &&
      (deal.owner_id === me.id || deal.created_by === me.id));

  // Readers also see the pipeline; only editors need the form pickers.
  const [pipeline, orgs, leads, owners, people, settings] = await Promise.all([
    getPipeline().catch(() => null),
    canWrite ? listOrganizations(me).catch(() => null) : Promise.resolve(null),
    canWrite
      ? listLeads({ page: 1, perPage: 200, ownerId: admin ? null : me.id }).catch(() => null)
      : Promise.resolve(null),
    admin ? teamPeople().catch(() => []) : Promise.resolve([]),
    teamPeople().catch(() => []),
    getDocSettings().catch(() => null),
  ]);

  const docParams = deal.org_id ? `org=${deal.org_id}` : deal.lead_id ? `lead=${deal.lead_id}` : "";
  const panels: RecordPanel[] = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div style={{ display: "grid", gap: 18 }}>
          <div className="card">
            <h2>Customer</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {deal.organization && (
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <strong>
                      <Link href={`/organizations/${deal.organization.id}`}>
                        {deal.organization.name}
                      </Link>
                    </strong>
                    <small style={{ color: "var(--muted)" }}>{deal.organization.ref}</small>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                    {[
                      deal.organization.contact_name,
                      deal.organization.contact_phone,
                      deal.organization.contact_email,
                      deal.organization.location,
                    ].filter(Boolean).join(" · ") || "No contact details recorded."}
                  </p>
                </div>
              )}
              {deal.lead && (
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <strong>
                      <Link href={`/leads/${deal.lead.id}`}>{deal.lead.name || "(no name)"}</Link>
                    </strong>
                    {deal.lead.company && (
                      <small style={{ color: "var(--muted)" }}>{deal.lead.company}</small>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                    {[deal.lead.phone, deal.lead.email, deal.lead.status].filter(Boolean).join(" · ") ||
                      "No contact details recorded."}
                  </p>
                </div>
              )}
              {!deal.organization && !deal.lead && (
                <p className="empty" style={{ margin: 0, padding: 0 }}>
                  No associated company or lead.
                  {canWrite && " Select a customer in Deal details."}
                </p>
              )}
            </div>
          </div>
          <div className="card">
            <h2>Description</h2>
            <p style={{ margin: 0, fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
              {deal.notes || "No description recorded."}
            </p>
            <dl className="qt-summary" style={{ marginTop: 14 }}>
              <div>
                <dt>Deal source</dt>
                <dd>{deal.source || "—"}</dd>
              </div>
              <div>
                <dt>Probability</dt>
                <dd>{deal.probability}%</dd>
              </div>
            </dl>
          </div>
        </div>
      ),
    },
    {
      id: "documents",
      label: "Documents",
      count: deal.documents.length,
      content: (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <div style={{ padding: "14px 18px" }}>
            <h2 style={{ margin: 0 }}>Customer documents</h2>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
              Documents associated with this deal’s customer, not exclusively with this deal.
            </p>
          </div>
          {deal.documents.length === 0 ? (
            <p className="empty" style={{ margin: 0, padding: "8px 18px 28px" }}>
              {docParams
                ? "No customer documents found. Quotations, invoices and receipts for the associated customer appear here."
                : "Associate a company or lead to view customer documents."}
            </p>
          ) : (
            <table className="tbl tbl-keep">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {deal.documents.map((doc) => (
                  <tr key={`${doc.kind}-${doc.id}`}>
                    <td className="tbl-keep">{doc.label}</td>
                    <td>
                      <Link href={`/${DOC_HREF[doc.kind] ?? "quotes"}/${doc.id}`} style={{ fontWeight: 600 }}>
                        {doc.ref}
                      </Link>
                    </td>
                    <td className="tbl-keep">{doc.date?.slice(0, 10) || "—"}</td>
                    <td className="tbl-keep">{doc.status || "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                      {money(doc.amount, doc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
    {
      id: "tasks",
      label: "Tasks",
      count: deal.tasks.length,
      content: (
        <TaskMini
          tasks={deal.tasks}
          people={people}
          meId={me.id}
          dealId={deal.id}
          orgId={deal.org_id ?? 0}
          leadId={deal.lead_id ?? 0}
        />
      ),
    },
  ];

  if (canWrite) {
    panels.push({
      id: "details",
      label: "Deal details",
      content: pipeline ? (
        <DealForm
          deal={deal}
          stages={pipeline.stages}
          organizations={(orgs?.organizations ?? []).map((o) => ({ id: o.id, name: o.name, hint: o.ref }))}
          leads={(leads?.rows ?? []).map((l) => ({ id: l.id, name: l.name, hint: l.company }))}
          owners={owners}
          canAssignOwner={admin}
          defaultCurrency={settings?.settings.default_currency ?? deal.currency ?? "NGN"}
        />
      ) : (
        <div className="msg err">Could not load deal stages. Reload the page to edit this deal.</div>
      ),
    });
  }

  return (
    <>
      <div className="head">
        <Link href="/deals" className="btn ghost">All deals</Link>
        <div className="spacer" />
        {canWrite && docParams && (
          <>
            <Link href={`/quotes/new?${docParams}`} className="btn ghost">+ Quotation</Link>
            <Link href={`/invoices/new?${docParams}`} className="btn ghost">+ Invoice</Link>
            <Link href={`/receipts/new?${docParams}`} className="btn ghost">+ Receipt</Link>
          </>
        )}
      </div>

      <div className="record-hero">
        <section className="card record-identity" aria-labelledby="deal-title">
          <p className="record-kicker">Deal · {deal.ref}</p>
          <h1 id="deal-title">{deal.title}</h1>
          <p>{deal.organization?.name || deal.lead?.company || deal.lead?.name || "No associated customer"}</p>
          <span className="pill" style={{ background: `${deal.stage_colour}1a`, color: deal.stage_colour }}>
            {deal.stage_label}
          </span>
        </section>
        <div className="record-metrics">
          <div className="card record-metric">
            <span>Amount</span>
            <strong>{money(deal.amount, deal.currency)}</strong>
          </div>
          <div className="card record-metric">
            <span>Deal owner</span>
            <strong>{deal.owner || "Unassigned"}</strong>
          </div>
          <div className="card record-metric">
            <span>Expected close date</span>
            <strong>{deal.close_date?.slice(0, 10) || "Not set"}</strong>
          </div>
          <div className="card record-metric">
            <span>Deal stage</span>
            <strong>{deal.stage_label}</strong>
          </div>
        </div>
      </div>

      {!!pipeline?.stages.length && (
        <section className="card record-pipeline" aria-labelledby="deal-pipeline-title">
          <h2 id="deal-pipeline-title">Deal pipeline</h2>
          <ol className="pipeline-track" aria-label="Deal stages">
            {pipeline.stages.map((stage) => (
              <li
                key={stage.key}
                className={`pipeline-step${stage.key === deal.stage ? " is-current" : ""}`}
                aria-current={stage.key === deal.stage ? "step" : undefined}
              >
                <strong>{stage.label}</strong>
                <small>{stage.probability}% probability</small>
              </li>
            ))}
          </ol>
        </section>
      )}

      {deal.stage_type === "lost" && (
        <div className="msg err">
          Closed lost{deal.lost_reason ? `: ${deal.lost_reason}` : "."}
          {canWrite && " Move the deal to an open stage in Deal details to reopen it."}
        </div>
      )}

      <div className="qt-page">
        <div className="qt-page__main">
          <RecordTabs id={`deal-${deal.id}`} panels={panels} />
        </div>
        <aside className="qt-page__side">
          <div className="card">
            <h2 style={{ marginBottom: 10 }}>Record summary</h2>
            <dl className="qt-summary">
              <div><dt>Reference</dt><dd>{deal.ref}</dd></div>
              <div><dt>Deal source</dt><dd>{deal.source || "—"}</dd></div>
              <div><dt>Probability</dt><dd>{deal.probability}%</dd></div>
              <div><dt>Created</dt><dd>{deal.created_at?.slice(0, 10) || "—"}</dd></div>
              <div>
                <dt>Last activity</dt>
                <dd>{(deal.last_activity_at ?? deal.updated_at)?.slice(0, 10) || "—"}</dd>
              </div>
            </dl>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Created by {deal.created_by_name || "—"}.
            </p>
          </div>
          <DealNotes dealId={deal.id} notes={deal.notes_list} canWrite={canWrite} meId={me.id} isAdmin={admin} />
          <div className="card">
            <h2>Activity</h2>
            {deal.activity.length === 0 ? (
              <p className="empty" style={{ padding: "8px 0", margin: 0 }}>No activity recorded.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {deal.activity.map((event) => (
                  <div key={event.id} style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    <strong>{event.value}</strong>
                    <br />
                    <small style={{ color: "var(--muted)" }}>
                      {event.actor_name || "—"} · {event.created_at?.slice(0, 16)}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
          {admin && (
            <div className="card">
              <h2>Delete deal</h2>
              <DeleteDocument kind="deal" id={deal.id} what={deal.title} redirectTo="/deals" label="Delete this deal" />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

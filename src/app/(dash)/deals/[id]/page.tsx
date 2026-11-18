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

  // Only the people who may edit this deal need the pickers; a reader gets the
  // summary on the left and nothing to submit.
  const [pipeline, orgs, leads, owners, people, settings] = await Promise.all([
    canWrite ? getPipeline() : Promise.resolve({ stages: [] }),
    canWrite ? listOrganizations(me).catch(() => null) : Promise.resolve(null),
    canWrite
      ? listLeads({ page: 1, perPage: 200, ownerId: admin ? null : me.id }).catch(() => null)
      : Promise.resolve(null),
    admin ? teamPeople().catch(() => []) : Promise.resolve([]),
    teamPeople().catch(() => []),
    getDocSettings().catch(() => null),
  ]);

  const docParams = deal.org_id ? `org=${deal.org_id}` : deal.lead_id ? `lead=${deal.lead_id}` : "";

  return (
    <>
      <div className="head">
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {deal.title}
          <span
            className="pill"
            style={{ background: `${deal.stage_colour}1a`, color: deal.stage_colour }}
          >
            {deal.stage_label}
          </span>
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--muted)" }}>{deal.ref}</span>
        </h1>
        <div className="spacer" />
        {canWrite && docParams && (
          <>
            <Link href={`/quotes/new?${docParams}`} className="btn ghost">
              + Quotation
            </Link>
            <Link href={`/invoices/new?${docParams}`} className="btn ghost">
              + Invoice
            </Link>
            <Link href={`/receipts/new?${docParams}`} className="btn ghost">
              + Receipt
            </Link>
          </>
        )}
        <Link href="/deals" className="btn ghost">
          All deals
        </Link>
      </div>

      {deal.stage_type === "lost" && (
        <div className="msg err">
          This deal was lost{deal.lost_reason ? `: ${deal.lost_reason}` : "."} Reopen it by moving it
          back to an open stage.
        </div>
      )}

      <div className="qt-page">
        <div className="qt-page__main" style={{ display: "grid", gap: 18 }}>
          {canWrite ? (
            <DealForm
              deal={deal}
              stages={pipeline.stages}
              organizations={(orgs?.organizations ?? []).map((o) => ({
                id: o.id,
                name: o.name,
                hint: o.ref,
              }))}
              leads={(leads?.rows ?? []).map((l) => ({ id: l.id, name: l.name, hint: l.company }))}
              owners={owners}
              canAssignOwner={admin}
              defaultCurrency={settings?.settings.default_currency ?? deal.currency ?? "NGN"}
            />
          ) : (
            <div className="card">
              <h2>The deal</h2>
              <dl className="qt-summary">
                <div>
                  <dt>Amount</dt>
                  <dd>{money(deal.amount, deal.currency)}</dd>
                </div>
                <div>
                  <dt>Stage</dt>
                  <dd>
                    {deal.stage_label} · {deal.probability}%
                  </dd>
                </div>
                <div>
                  <dt>Expected close</dt>
                  <dd>{deal.close_date?.slice(0, 10) || "—"}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{deal.owner || "—"}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{deal.source || "—"}</dd>
                </div>
              </dl>
              {deal.notes && (
                <p style={{ margin: "12px 0 0", fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                  {deal.notes}
                </p>
              )}
            </div>
          )}

          <div className="card">
            <h2>The customer</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {deal.organization ? (
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
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No contact details recorded yet."}
                  </p>
                </div>
              ) : (
                <p className="empty" style={{ margin: 0, padding: 0 }}>
                  Not attached to an organisation. Bulk buyers and partners keep one record for
                  every deal.
                </p>
              )}

              {deal.lead && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
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
                      "No contact details recorded yet."}
                  </p>
                </div>
              )}

              {!deal.organization && !deal.lead && (
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>
                  Attach an organisation or a lead above so the papers and follow-ups gather here.
                </p>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div className="row" style={{ padding: "14px 18px" }}>
              <h2 style={{ margin: 0 }}>Their papers</h2>
              <div style={{ flex: 1 }} />
              <small style={{ color: "var(--muted)" }}>{deal.documents.length} in total</small>
            </div>
            {deal.documents.length === 0 ? (
              <p className="empty" style={{ margin: 0, padding: "8px 18px 28px" }}>
                No quotations, invoices or receipts against this deal yet.
              </p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Ref</th>
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

          <TaskMini
            tasks={deal.tasks}
            people={people}
            meId={me.id}
            dealId={deal.id}
            orgId={deal.org_id ?? 0}
            leadId={deal.lead_id ?? 0}
          />
        </div>

        <aside className="qt-page__side">
          <div className="card">
            <h2 style={{ marginBottom: 10 }}>At a glance</h2>
            <dl className="qt-summary">
              <div>
                <dt>Reference</dt>
                <dd>{deal.ref}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{money(deal.amount, deal.currency)}</dd>
              </div>
              <div>
                <dt>Stage</dt>
                <dd>
                  {deal.stage_label} · {deal.probability}%
                </dd>
              </div>
              <div>
                <dt>Expected close</dt>
                <dd>{deal.close_date?.slice(0, 10) || "—"}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{deal.owner || "—"}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{deal.created_at?.slice(0, 10)}</dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>{(deal.last_activity_at ?? deal.updated_at)?.slice(0, 10)}</dd>
              </div>
            </dl>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Added by {deal.created_by_name || "—"}.
            </p>
          </div>

          <DealNotes
            dealId={deal.id}
            notes={deal.notes_list}
            canWrite={canWrite}
            meId={me.id}
            isAdmin={admin}
          />

          <div className="card">
            <h2>Activity</h2>
            {deal.activity.length === 0 ? (
              <p className="empty" style={{ padding: "8px 0", margin: 0 }}>
                Nothing has happened on this deal yet.
              </p>
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
              <h2>Danger</h2>
              <DeleteDocument
                kind="deal"
                id={deal.id}
                what={deal.title}
                redirectTo="/deals"
                label="Delete this deal"
              />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import {
  getOrganization,
  listDeals,
  listLeads,
  listTasks,
  teamPeople,
} from "@/lib/queries";
import { hasPermission, isAdminRole, money } from "@/lib/types";
import OrganizationForm from "../form";
import NoteBox from "../note-box";
import TaskMini from "../../task-mini";
import DeleteDocument from "../../delete-document";

const DOC_HREF: Record<string, string> = {
  quotation: "quotes",
  invoice: "invoices",
  receipt: "receipts",
};

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const data = await getOrganization(me, Number(id)).catch(() => null);
  if (!data?.organization) notFound();
  const org = data.organization;

  const admin = isAdminRole(me.role);
  const working = me.role !== "author" && me.role !== "md";
  const canWrite =
    admin || (me.role === "subadmin" && hasPermission(me, "add_leads") && org.assigned_to === me.id);
  const [owners, deals, orgTasks, contactList, people] = await Promise.all([
    admin ? teamPeople().catch(() => []) : Promise.resolve([]),
    // Authors and the MD read this page but do not work the pipeline; their
    // view stays the organisation and its papers, as it was before deals.
    working ? listDeals(me, { org_id: org.id }).then((r) => r.deals).catch(() => []) : Promise.resolve([]),
    working
      ? listTasks(me, { org_id: org.id, scope: "all", limit: 100 }).then((r) => r.tasks).catch(() => [])
      : Promise.resolve([]),
    // "Contacts" here means leads whose company is this business. There is no
    // separate contact table to fall out of step with the lead list.
    working
      ? listLeads({
          search: org.name,
          perPage: 25,
          ownerId: admin ? null : me.id,
        })
          .then((r) => r.rows)
          .catch(() => [])
      : Promise.resolve([]),
    working ? teamPeople().catch(() => []) : Promise.resolve([]),
  ]);
  const needle = org.name.trim().toLowerCase();
  const contacts = contactList.filter((l) => {
    const company = (l.company ?? "").trim().toLowerCase();
    return company && (company.includes(needle) || needle.includes(company));
  });

  return (
    <>
      <div className="head">
        <h1>
          {org.name}
          <span className={`pill o-${org.status}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>
            {org.status_label}
          </span>
        </h1>
        <div className="spacer" />
        {canWrite && (
          <>
            <Link href={`/deals/new?org=${org.id}`} className="btn ghost">
              + Deal
            </Link>
            <Link href={`/quotes/new?org=${org.id}`} className="btn ghost">
              + Quotation
            </Link>
            <Link href={`/invoices/new?org=${org.id}`} className="btn ghost">
              + Invoice
            </Link>
            <Link href={`/receipts/new?org=${org.id}`} className="btn ghost">
              + Receipt
            </Link>
          </>
        )}
        <Link href="/organizations" className="btn ghost">
          All organisations
        </Link>
      </div>

      <div className="qt-page">
        <div className="qt-page__main" style={{ display: "grid", gap: 18 }}>
          {canWrite ? (
            <OrganizationForm organization={org} owners={owners} canAssignOwner={admin} />
          ) : (
            <div className="card">
              <h2>The organisation</h2>
              <dl className="qt-summary">
                <div>
                  <dt>Kind</dt>
                  <dd>{org.org_type_label}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>{org.contact_name || "—"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{org.contact_phone || "—"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{org.contact_email || "—"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{org.location || org.country || "—"}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{org.owner || "—"}</dd>
                </div>
              </dl>
              {org.notes && (
                <p style={{ margin: "12px 0 0", fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{org.notes}</p>
              )}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div className="row" style={{ padding: "14px 18px" }}>
              <h2 style={{ margin: 0 }}>Their papers</h2>
              <div style={{ flex: 1 }} />
              <small style={{ color: "var(--muted)" }}>{org.documents.length} in total</small>
            </div>
            {org.documents.length === 0 ? (
              <p className="empty" style={{ margin: 0, padding: "8px 18px 28px" }}>
                No quotations, invoices or receipts for {org.name} yet.
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
                  {org.documents.map((doc) => (
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

          {working && (
            <>
          <div className="card">
            <div className="row">
              <h2 style={{ margin: 0 }}>Deals</h2>
              <div style={{ flex: 1 }} />
              <Link href={`/deals/new?org=${org.id}`} className="btn ghost sm">
                + New deal
              </Link>
            </div>
            {deals.length === 0 ? (
              <p className="empty" style={{ padding: "14px 0 0", margin: 0 }}>
                Nothing on the table with {org.name} yet.
              </p>
            ) : (
              <table className="tbl" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Stage</th>
                    <th>Close</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/deals/${d.id}`} style={{ fontWeight: 600 }}>
                          {d.title}
                        </Link>
                        <br />
                        <small style={{ color: "var(--muted)" }}>{d.ref}</small>
                      </td>
                      <td className="tbl-keep">
                        <span
                          className="pill"
                          style={{ background: `${d.stage_colour}1a`, color: d.stage_colour }}
                        >
                          {d.stage_label}
                        </span>
                      </td>
                      <td className="tbl-keep">{d.close_date?.slice(0, 10) || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {money(d.amount, d.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="row">
              <h2 style={{ margin: 0 }}>People</h2>
              <div style={{ flex: 1 }} />
              <small style={{ color: "var(--muted)" }}>leads whose company is {org.name}</small>
            </div>
            {contacts.length === 0 ? (
              <p className="empty" style={{ padding: "14px 0 0", margin: 0 }}>
                No lead has named {org.name} as its company yet.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {contacts.map((c) => (
                  <div key={c.id} className="row" style={{ gap: 8 }}>
                    <Link href={`/leads/${c.id}`} style={{ fontWeight: 600 }}>
                      {c.name || "(no name)"}
                    </Link>
                    <small style={{ color: "var(--muted)" }}>
                      {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact details"}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <TaskMini
            tasks={orgTasks}
            people={people}
            meId={me.id}
            orgId={org.id}
          />
            </>
          )}
        </div>

        <aside className="qt-page__side">
          <div className="card">
            <h2 style={{ marginBottom: 10 }}>At a glance</h2>
            <dl className="qt-summary">
              <div>
                <dt>Reference</dt>
                <dd>{org.ref}</dd>
              </div>
              <div>
                <dt>Kind</dt>
                <dd>{org.org_type_label}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{org.owner || "—"}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{org.created_at?.slice(0, 10)}</dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>{(org.last_activity_at ?? org.created_at)?.slice(0, 10)}</dd>
              </div>
            </dl>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Added by {org.created_by_name || "—"}.
            </p>
          </div>

          <NoteBox
            orgId={org.id}
            notes={org.notes_list}
            canWrite={canWrite}
            meId={me.id}
            isAdmin={admin}
          />

          <div className="card">
            <h2>Activity</h2>
            {org.activity.length === 0 ? (
              <p className="empty" style={{ padding: "8px 0", margin: 0 }}>
                Nothing has happened yet.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {org.activity.map((event) => (
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
                kind="organization"
                id={org.id}
                what={org.name}
                redirectTo="/organizations"
                label="Delete this organisation"
              />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

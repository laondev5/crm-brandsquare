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
import OrgFiles from "./files";
import NoteBox from "../note-box";
import TaskMini from "../../task-mini";
import DeleteDocument from "../../delete-document";
import RecordTabs, { type RecordPanel } from "../../record-tabs";

const DOC_HREF: Record<string, string> = {
  quotation: "quotes",
  invoice: "invoices",
  receipt: "receipts",
};

export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requireMember();
  const { id } = await params;
  const { tab } = await searchParams;
  const data = await getOrganization(me, Number(id)).catch(() => null);
  if (!data?.organization) notFound();
  const org = data.organization;

  const admin = isAdminRole(me.role);
  const working = me.role !== "author" && me.role !== "md";
  const canWrite =
    admin || (me.role === "subadmin" && hasPermission(me, "add_leads") && org.assigned_to === me.id);
  const [owners, deals, orgTasks, contactList, people] = await Promise.all([
    admin ? teamPeople().catch(() => []) : Promise.resolve([]),
    // Authors and the MD can read the company and its documents, not pipeline work.
    working ? listDeals(me, { org_id: org.id }).then((r) => r.deals).catch(() => null) : Promise.resolve(null),
    working
      ? listTasks(me, { org_id: org.id, scope: "all", limit: 100 }).then((r) => r.tasks).catch(() => null)
      : Promise.resolve(null),
    // Contacts are name-matched leads, not a hard company association.
    working
      ? listLeads({ search: org.name, perPage: 25, ownerId: admin ? null : me.id })
          .then((r) => r.rows)
          .catch(() => null)
      : Promise.resolve(null),
    working ? teamPeople().catch(() => []) : Promise.resolve([]),
  ]);
  const needle = org.name.trim().toLowerCase();
  const contacts = contactList?.filter((l) => {
    const company = (l.company ?? "").trim().toLowerCase();
    return needle && company && (company.includes(needle) || needle.includes(company));
  });

  const panels: RecordPanel[] = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div className="card">
          <h2>Company summary</h2>
          <dl className="qt-summary">
            <div><dt>Company type</dt><dd>{org.org_type_label}</dd></div>
            <div><dt>Contact</dt><dd>{org.contact_name || "—"}</dd></div>
            <div><dt>Phone</dt><dd>{org.contact_phone || "—"}</dd></div>
            <div><dt>Email</dt><dd>{org.contact_email || "—"}</dd></div>
            <div><dt>Location</dt><dd>{org.location || org.country || "—"}</dd></div>
            <div><dt>Company owner</dt><dd>{org.owner || "Unassigned"}</dd></div>
          </dl>
          <h2 style={{ marginTop: 18 }}>Description</h2>
          <p style={{ margin: 0, fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
            {org.notes || "No description recorded."}
          </p>
        </div>
      ),
    },
    {
      id: "documents",
      label: "Documents",
      count: org.documents.length,
      content: (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <div className="row" style={{ padding: "14px 18px" }}>
            <h2 style={{ margin: 0 }}>Company documents</h2>
            <div style={{ flex: 1 }} />
            <small style={{ color: "var(--muted)" }}>{org.documents.length} total</small>
          </div>
          {org.documents.length === 0 ? (
            <p className="empty" style={{ margin: 0, padding: "8px 18px 28px" }}>
              No quotations, invoices or receipts found for {org.name}.
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
      ),
    },
  ];

  if (working) {
    panels.push(
      {
        id: "deals",
        label: "Deals",
        count: deals?.length,
        content: (
          <div className="card" style={{ overflowX: "auto" }}>
            <div className="row">
              <h2 style={{ margin: 0 }}>Company deals</h2>
              <div style={{ flex: 1 }} />
              {canWrite && (
                <Link href={`/deals/new?org=${org.id}`} className="btn ghost sm">+ New deal</Link>
              )}
            </div>
            {!deals ? (
              <p className="msg err">Could not load company deals. Reload the page to try again.</p>
            ) : deals.length === 0 ? (
              <p className="empty" style={{ padding: "14px 0 0", margin: 0 }}>
                No deals associated with this company.
              </p>
            ) : (
              <table className="tbl tbl-keep" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Stage</th>
                    <th>Expected close date</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id}>
                      <td>
                        <Link href={`/deals/${deal.id}`} style={{ fontWeight: 600 }}>{deal.title}</Link>
                        <br />
                        <small style={{ color: "var(--muted)" }}>{deal.ref}</small>
                      </td>
                      <td className="tbl-keep">
                        <span className="pill" style={{ background: `${deal.stage_colour}1a`, color: deal.stage_colour }}>
                          {deal.stage_label}
                        </span>
                      </td>
                      <td className="tbl-keep">{deal.close_date?.slice(0, 10) || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {money(deal.amount, deal.currency)}
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
        id: "contacts",
        label: "Contacts",
        count: contacts?.length,
        content: (
          <div className="card">
            <h2>Matching company contacts</h2>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>
              Leads with a company name matching {org.name}. These are name-based matches, not linked company contacts.
            </p>
            {!contacts ? (
              <p className="msg err">Could not load matching contacts. Reload the page to try again.</p>
            ) : contacts.length === 0 ? (
              <p className="empty" style={{ padding: "14px 0 0", margin: 0 }}>
                No matching company contacts found among the available leads.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {contacts.map((contact) => (
                  <div key={contact.id} className="row" style={{ gap: 8 }}>
                    <Link href={`/leads/${contact.id}`} style={{ fontWeight: 600 }}>
                      {contact.name || "(no name)"}
                    </Link>
                    <small style={{ color: "var(--muted)" }}>
                      {[contact.company, contact.phone, contact.email].filter(Boolean).join(" · ") || "No contact details"}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "tasks",
        label: "Tasks",
        count: orgTasks?.length,
        content: orgTasks ? (
          <TaskMini tasks={orgTasks} people={people} meId={me.id} orgId={org.id} />
        ) : (
          <div className="msg err">Could not load company tasks. Reload the page to try again.</div>
        ),
      },
    );
  }

  panels.push({
    id: "files",
    label: "Files",
    count: org.files?.length,
    content: <OrgFiles orgId={org.id} initial={org.files ?? []} canWrite={canWrite} />,
  });

  if (canWrite) {
    panels.push({
      id: "details",
      label: "Company details",
      content: <OrganizationForm organization={org} owners={owners} canAssignOwner={admin} />,
    });
  }

  return (
    <>
      <div className="head">
        <Link href="/organizations" className="btn ghost">All companies</Link>
        <div className="spacer" />
        {canWrite && (
          <>
            <Link href={`/organizations/${org.id}?tab=details`} className="btn ghost">
              Edit company
            </Link>
            <Link href={`/deals/new?org=${org.id}`} className="btn ghost">+ Deal</Link>
            <Link href={`/quotes/new?org=${org.id}`} className="btn ghost">+ Quotation</Link>
            <Link href={`/invoices/new?org=${org.id}`} className="btn ghost">+ Invoice</Link>
            <Link href={`/receipts/new?org=${org.id}`} className="btn ghost">+ Receipt</Link>
          </>
        )}
      </div>

      <div className="record-hero">
        <section className="card record-identity" aria-labelledby="company-title">
          <p className="record-kicker">Company · {org.ref}</p>
          <h1 id="company-title">{org.name}</h1>
          <p>{[org.org_type_label, org.location || org.country].filter(Boolean).join(" · ")}</p>
          <span className={`pill o-${org.status}`}>{org.status_label}</span>
        </section>
        <div className="record-metrics">
          <div className="card record-metric">
            <span>Status</span>
            <strong>{org.status_label}</strong>
          </div>
          <div className="card record-metric">
            <span>Company owner</span>
            <strong>{org.owner || "Unassigned"}</strong>
          </div>
          <div className="card record-metric">
            <span>Documents</span>
            <strong>{org.documents.length}</strong>
          </div>
          <div className="card record-metric">
            <span>{working ? "Deals" : "Company type"}</span>
            <strong>{working ? (deals?.length ?? "Unavailable") : org.org_type_label}</strong>
          </div>
        </div>
      </div>

      <div className="qt-page">
        <div className="qt-page__main">
          <RecordTabs
            id={`company-${org.id}`}
            panels={panels}
            initial={tab && panels.some((p) => p.id === tab) ? tab : undefined}
          />
        </div>
        <aside className="qt-page__side">
          <div className="card">
            <h2 style={{ marginBottom: 10 }}>Record summary</h2>
            <dl className="qt-summary">
              <div><dt>Reference</dt><dd>{org.ref}</dd></div>
              <div><dt>Company type</dt><dd>{org.org_type_label}</dd></div>
              <div><dt>Company owner</dt><dd>{org.owner || "Unassigned"}</dd></div>
              <div><dt>Created</dt><dd>{org.created_at?.slice(0, 10) || "—"}</dd></div>
              <div>
                <dt>Last activity</dt>
                <dd>{(org.last_activity_at ?? org.created_at)?.slice(0, 10) || "—"}</dd>
              </div>
            </dl>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Created by {org.created_by_name || "—"}.
            </p>
          </div>
          <NoteBox orgId={org.id} notes={org.notes_list} canWrite={canWrite} meId={me.id} isAdmin={admin} />
          <div className="card">
            <h2>Activity</h2>
            {org.activity.length === 0 ? (
              <p className="empty" style={{ padding: "8px 0", margin: 0 }}>No activity recorded.</p>
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
              <h2>Delete company</h2>
              <DeleteDocument kind="organization" id={org.id} what={org.name} redirectTo="/organizations" label="Delete this company" />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

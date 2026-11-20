import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { listOrganizations } from "@/lib/queries";
import { hasPermission, isAdminRole, ORG_STATUSES, ORG_TYPES } from "@/lib/types";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string; sort?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const status = ORG_STATUSES.some((s) => s.key === sp.status) ? (sp.status as string) : "";
  const type = ORG_TYPES.some((t) => t.key === sp.type) ? (sp.type as string) : "";
  const sort = sp.sort === "name" || sp.sort === "quiet" ? sp.sort : "recent";

  const data = await listOrganizations(me, { status: status || undefined, type: type || undefined, q: sp.q, sort }).catch(
    () => null
  );
  const mayAdd = isAdminRole(me.role) || (me.role === "subadmin" && hasPermission(me, "add_leads"));

  const tab = (key: string, label: string, count?: number) => {
    const params = new URLSearchParams();
    if (key) params.set("status", key);
    if (type) params.set("type", type);
    if (sp.q) params.set("q", sp.q);
    if (sort !== "recent") params.set("sort", sort);
    return (
      <Link key={key || "all"} href={`/organizations${params.toString() ? `?${params}` : ""}`} className={`seg__btn${status === key ? " is-on" : ""}`}>
        {label}
        {typeof count === "number" && <span className="seg__count">{count}</span>}
      </Link>
    );
  };

  return (
    <>
      <div className="head">
        <h1>Companies</h1>
        <div className="spacer" />
        {mayAdd && (
          <Link href="/organizations/new" className="btn">
            Create company
          </Link>
        )}
      </div>

      <p className="board-hint">
        Manage company relationships, contact information, deals and sales documents in one place.
      </p>

      {!data ? (
        <div className="msg err">Could not load organisations. The plugin needs to be version 1.38 or newer.</div>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 12 }}>
            {tab("", "All", data.counts.all)}
            {ORG_STATUSES.map((s) => tab(s.key, s.label, data.counts[s.key]))}
          </div>

          <form className="row" style={{ gap: 8, marginBottom: 14 }}>
            {status && <input type="hidden" name="status" value={status} />}
            {sort !== "recent" && <input type="hidden" name="sort" value={sort} />}
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search a name, contact, sector or number"
              style={{ flex: 1, maxWidth: 360 }}
            />
            <select name="type" defaultValue={type} style={{ width: "auto" }}>
              <option value="">All company types</option>
              {ORG_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} style={{ width: "auto" }}>
              <option value="recent">Most recent</option>
              <option value="name">Name</option>
              <option value="quiet">Oldest activity first</option>
            </select>
            <button className="btn ghost sm">Search</button>
          </form>

          {data.organizations.length === 0 ? (
            <p className="empty" style={{ padding: 28 }}>
              {sp.q || status || type
                ? "No companies match these filters."
                : "No companies yet. Create a company to organise related contacts, deals and documents."}
            </p>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="tbl tbl-keep">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Company</th>
                    <th>Company type</th>
                    <th>Contact</th>
                    <th>Owner</th>
                    <th>Last activity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.organizations.map((org) => (
                    <tr key={org.id}>
                      <td>
                        <Link href={`/organizations/${org.id}`} style={{ fontWeight: 600 }}>
                          {org.ref}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/organizations/${org.id}`} className="name">
                          {org.name}
                        </Link>
                        {org.sector && (
                          <>
                            <br />
                            <small style={{ color: "var(--muted)" }}>{org.sector}</small>
                          </>
                        )}
                      </td>
                      <td className="tbl-keep">
                        <span className={`pill t-${org.org_type}`}>{org.org_type_label}</span>
                      </td>
                      <td>
                        {org.contact_name || "—"}
                        {org.contact_phone && (
                          <>
                            <br />
                            <small style={{ color: "var(--muted)" }}>{org.contact_phone}</small>
                          </>
                        )}
                      </td>
                      <td className="tbl-keep">{org.owner || "—"}</td>
                      <td className="tbl-keep">{(org.last_activity_at ?? org.created_at)?.slice(0, 10)}</td>
                      <td>
                        <span className={`pill o-${org.status}`}>{org.status_label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

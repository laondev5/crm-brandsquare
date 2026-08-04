import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listLeads } from "@/lib/queries";
import { LEAD_STATUSES } from "@/lib/types";
import StatusPill from "../pill";

const TABS = [
  { key: "", label: "All" },
  { key: "open", label: "Open" },
  { key: "unassigned", label: "Unassigned" },
  { key: "overdue", label: "Overdue" },
  ...LEAD_STATUSES.map((s) => ({ key: s.key, label: s.label })),
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; s?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireUser();
  const scope = me.role === "admin" ? null : me.id;

  const { rows, total, pages, page } = await listLeads({
    status: sp.status,
    search: sp.s,
    ownerId: scope,
    page: Number(sp.page) || 1,
  });

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: sp.status, s: sp.s, ...over };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const str = p.toString();
    return str ? `/leads?${str}` : "/leads";
  };

  return (
    <>
      <div className="head">
        <h1>{me.role === "admin" ? "Leads" : "My leads"}</h1>
        <div className="spacer" />
        <form className="row" action="/leads">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input
            type="search"
            name="s"
            defaultValue={sp.s ?? ""}
            placeholder="Search name, email, phone, answers…"
            style={{ width: 280 }}
          />
          <button className="btn ghost">Search</button>
        </form>
      </div>

      <div className="tabs">
        {TABS.map((tb) => (
          <Link key={tb.key || "all"} href={qs({ status: tb.key || undefined, page: undefined })}
                className={(sp.status ?? "") === tb.key ? "on" : ""}>
            {tb.label}
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: "6px 8px" }}>
        {rows.length === 0 ? (
          <p className="empty">No leads match this view.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 64 }}>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ width: 110 }}>Stage</th>
                <th style={{ width: 140 }}>Owner</th>
                <th style={{ width: 130 }}>Received</th>
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
                  <td data-l="Phone">{l.phone || "—"}</td>
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

      {pages > 1 && (
        <div className="row" style={{ marginTop: 16, justifyContent: "center" }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={qs({ page: String(n) })} className={`btn ${n === page ? "" : "ghost"}`}>
              {n}
            </Link>
          ))}
        </div>
      )}

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 14 }}>
        {total} lead{total === 1 ? "" : "s"}
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

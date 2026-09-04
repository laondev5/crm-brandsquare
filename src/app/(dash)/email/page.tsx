import Link from "next/link";
import { isAdminRole } from "@/lib/types";
import { requireUser } from "@/lib/auth";
import { listEmailCampaigns } from "@/lib/queries";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  // Sub-admins see only the sends they made.
  const { rows, total, pages } = await listEmailCampaigns(
    page,
    isAdminRole(me.role) ? null : me.id
  );

  return (
    <>
      <div className="head">
        <h1>Email marketing</h1>
        <div className="spacer" />
        {isAdminRole(me.role) && (
          <Link href="/email/settings" className="btn ghost">
            Sender settings
          </Link>
        )}
        <Link href="/email/new" className="btn">
          New email
        </Link>
      </div>

      <div className="card" style={{ padding: "6px 8px" }}>
        {rows.length === 0 ? (
          <p className="empty">
            No emails sent yet. <Link href="/email/new" style={{ color: "var(--p)", fontWeight: 600 }}>Write your first one</Link>.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Subject</th>
                <th style={{ width: 130 }}>Audience</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 140 }}>Delivered</th>
                <th style={{ width: 130 }}>Sent by</th>
                <th style={{ width: 120 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const pct = c.total ? Math.round((c.sent / c.total) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td data-l="ID">#{c.id}</td>
                    <td data-l="Subject">
                      <Link href={`/email/${c.id}`} className="name">
                        {c.subject}
                      </Link>
                    </td>
                    <td data-l="Audience">
                      {c.audience === "all" ? "All leads" : c.audience === "form" ? "One campaign" : "Selected"}
                    </td>
                    <td data-l="Status">
                      <span className={`pill ${statusClass(c.status)}`}>{label(c.status)}</span>
                    </td>
                    <td data-l="Delivered">
                      <strong style={{ color: "var(--ink)" }}>{c.sent}</strong>
                      <span style={{ color: "var(--muted)" }}> / {c.total}</span>
                      {c.failed > 0 && (
                        <span style={{ color: "var(--err)" }}> · {c.failed} failed</span>
                      )}
                      {c.status === "sending" && (
                        <span style={{ color: "var(--muted)" }}> ({pct}%)</span>
                      )}
                    </td>
                    <td data-l="Sent by">{c.created_by || "—"}</td>
                    <td data-l="Date">{fmt(c.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="row" style={{ marginTop: 16, justifyContent: "center" }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`/email?page=${n}`} className={`btn ${n === page ? "" : "ghost"}`}>
              {n}
            </Link>
          ))}
        </div>
      )}

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16, maxWidth: 720 }}>
        {total} email{total === 1 ? "" : "s"}. Sending happens on the WordPress server in small
        batches, so a large send keeps going after you close this page. Every email carries an
        unsubscribe link, and anyone who uses it is excluded from future sends automatically.
      </p>
    </>
  );
}

function statusClass(s: string) {
  if (s === "sent") return "s-won";
  if (s === "sending") return "s-assigned";
  if (s === "failed") return "s-lost";
  return "s-new";
}

function label(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

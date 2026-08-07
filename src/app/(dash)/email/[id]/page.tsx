import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEmailCampaign } from "@/lib/queries";

export default async function EmailDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id: raw } = await params;
  const c = await getEmailCampaign(Number(raw));
  if (!c) notFound();

  const pct = c.total ? Math.round((c.sent / c.total) * 100) : 0;
  const pending = c.byStatus.pending ?? 0;
  const failed = c.recipients.filter((r) => r.status === "failed");

  return (
    <>
      <div className="head">
        <h1>{c.subject}</h1>
        <span className={`pill ${c.status === "sent" ? "s-won" : c.status === "sending" ? "s-assigned" : "s-new"}`}>
          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
        </span>
        <div className="spacer" />
        <Link href="/email" className="btn ghost">
          All emails
        </Link>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Recipients</span>
          <b>{c.total}</b>
        </div>
        <div className="stat accent">
          <span>Delivered</span>
          <b>{c.sent}</b>
        </div>
        <div className="stat">
          <span>Failed</span>
          <b style={{ color: c.failed ? "var(--err)" : undefined }}>{c.failed}</b>
        </div>
        <div className="stat">
          <span>Still queued</span>
          <b>{pending}</b>
        </div>
      </div>

      {c.status === "sending" && (
        <div className="msg ok">
          Sending in progress — {pct}% done. Batches go out every couple of minutes; refresh to
          update.
        </div>
      )}

      {failed.length > 0 && (
        <div className="msg err">
          {failed.length} message{failed.length === 1 ? "" : "s"} could not be sent. The usual
          cause is an invalid address or the host&rsquo;s hourly send limit.
        </div>
      )}

      <div className="grid2">
        <div className="card" style={{ padding: "6px 8px" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 150 }}>Sent</th>
              </tr>
            </thead>
            <tbody>
              {c.recipients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    No recipients recorded.
                  </td>
                </tr>
              ) : (
                c.recipients.map((r) => (
                  <tr key={r.id}>
                    <td data-l="Name">
                      {r.lead_id ? (
                        <Link href={`/leads/${r.lead_id}`} className="name">
                          {r.name || "(no name)"}
                        </Link>
                      ) : (
                        r.name || "(no name)"
                      )}
                    </td>
                    <td data-l="Email">{r.email}</td>
                    <td data-l="Status">
                      <span
                        className={`pill ${
                          r.status === "sent" ? "s-won" : r.status === "failed" ? "s-lost" : "s-new"
                        }`}
                        title={r.status === "failed" ? r.error : undefined}
                      >
                        {r.status}
                      </span>
                      {r.status === "failed" && r.error && (
                        <div style={{ fontSize: 11, color: "var(--err)", marginTop: 3 }}>
                          {r.error}
                        </div>
                      )}
                    </td>
                    <td data-l="Sent">{r.sent_at ? fmt(r.sent_at) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Details</h2>
          <table className="kv">
            <tbody>
              <tr>
                <th>Sent by</th>
                <td>{c.created_by || "—"}</td>
              </tr>
              <tr>
                <th>Audience</th>
                <td>
                  {c.audience === "all"
                    ? "All leads"
                    : c.audience === "form"
                    ? "One campaign form"
                    : "Selected leads"}
                </td>
              </tr>
              <tr>
                <th>Created</th>
                <td>{fmt(c.created_at)}</td>
              </tr>
              <tr>
                <th>Started</th>
                <td>{c.started_at ? fmt(c.started_at) : "—"}</td>
              </tr>
              <tr>
                <th>Finished</th>
                <td>{c.finished_at ? fmt(c.finished_at) : "—"}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0, marginTop: 12 }}>
            Only the first 200 recipients are listed here.
          </p>
        </div>
      </div>
    </>
  );
}

function fmt(d: string) {
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLeadFull, allSubadmins } from "@/lib/queries";
import { LEAD_STATUSES, parsePayload } from "@/lib/types";
import { updateLeadAction } from "../../../actions/leads";
import StatusPill from "../../pill";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  const me = await requireUser();
  const scope = me.role === "admin" ? null : me.id;

  const full = await getLeadFull(id, scope);
  if (!full) notFound();

  const { lead, notes, activity } = full;
  const subs = me.role === "admin" ? await allSubadmins() : [];

  const answers = parsePayload(lead.payload);
  const overdue =
    lead.next_action_at &&
    new Date(lead.next_action_at.replace(" ", "T")) < new Date() &&
    !["won", "lost"].includes(lead.status);

  return (
    <>
      <div className="head">
        <h1>
          Lead #{lead.id} <StatusPill status={lead.status} />
        </h1>
        <div className="spacer" />
        <Link href="/leads" className="btn ghost">
          Back to leads
        </Link>
      </div>

      {overdue && <div className="msg err">Follow-up was due {fmtDT(lead.next_action_at!)}.</div>}

      <div className="grid2">
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <h2>Submitted answers</h2>
            <table className="kv">
              <tbody>
                {answers.map((a, i) => (
                  <tr key={i}>
                    <th>{a.label}</th>
                    <td>{a.value || "—"}</td>
                  </tr>
                ))}
                <tr>
                  <th>Source page</th>
                  <td>
                    {lead.source_url ? (
                      <a href={lead.source_url} target="_blank" rel="noopener noreferrer">
                        {lead.source_url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Received</th>
                  <td>{fmtDT(lead.created_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Notes</h2>
            {notes.length === 0 && <p className="empty" style={{ padding: "18px 0" }}>No notes yet.</p>}
            {notes.map((n) => (
              <div className="note" key={n.id}>
                <p>{n.body}</p>
                <small>
                  {n.author_name} · {fmtDT(n.created_at)}
                </small>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Activity</h2>
            <ul className="tl">
              {activity.map((a) => (
                <li key={a.id}>
                  <b>{cap(a.type)}</b>
                  {(a.from_value || a.to_value) && (
                    <span> {a.from_value ? `${a.from_value} → ${a.to_value}` : a.to_value}</span>
                  )}
                  <small>
                    {a.actor_name} · {fmtDT(a.created_at)}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <form className="card" action={updateLeadAction}>
          <h2>Manage</h2>
          <input type="hidden" name="id" value={lead.id} />

          <label className="f">
            <span>Stage</span>
            <select name="status" defaultValue={lead.status}>
              {LEAD_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {me.role === "admin" && (
            <label className="f">
              <span>Assigned to</span>
              <select name="assigned_to" defaultValue={lead.assigned_to ?? 0}>
                <option value={0}>Unassigned</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.email}
                    {s.status !== "active" ? ` (${s.status})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="f">
            <span>Next action due</span>
            <input
              type="datetime-local"
              name="next_action_at"
              defaultValue={lead.next_action_at ? lead.next_action_at.replace(" ", "T").slice(0, 16) : ""}
            />
          </label>

          <label className="f">
            <span>Add a note</span>
            <textarea name="note" placeholder="What happened on this lead?" />
          </label>

          <button className="btn" style={{ width: "100%", justifyContent: "center" }}>
            Save changes
          </button>
        </form>
      </div>
    </>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDT(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  allSubadmins,
  getEmailSettings,
  getLeadEmails,
  getLeadFull,
  getPipeline,
} from "@/lib/queries";
import { daysQuiet, hasPermission, isClosed, isStale, parsePayload } from "@/lib/types";

import Manage from "./manage";
import StatusPill from "../../pill";
import WhatsAppButton from "./whatsapp-button";
import EmailPanel from "./email-panel";
import Notes from "./notes";
import DeleteLead from "./delete-lead";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  const me = await requireUser();
  const scope = me.role === "admin" ? null : me.id;

  const full = await getLeadFull(id, scope);
  if (!full) notFound();

  const { lead, notes, activity } = full;
  const [subs, emailHistory, emailSettings, pipeline] = await Promise.all([
    me.role === "admin" ? allSubadmins() : Promise.resolve([]),
    getLeadEmails(id, scope),
    getEmailSettings().catch(() => null),
    getPipeline(),
  ]);

  const answers = parsePayload(lead.payload);
  const overdue =
    lead.next_action_at &&
    new Date(lead.next_action_at.replace(" ", "T")) < new Date() &&
    !isClosed(pipeline, lead.status);

  return (
    <>
      <div className="head">
        <h1>
          Lead #{lead.id} <StatusPill status={lead.status} pipeline={pipeline} />
        </h1>
        <div className="spacer" />
        {hasPermission(me, "send_whatsapp") && lead.phone && (
          <WhatsAppButton leadId={lead.id} phone={lead.phone} />
        )}
        <Link href="/leads" className="btn ghost">
          Back to leads
        </Link>
      </div>

      {overdue && <div className="msg err">Follow-up was due {fmtDT(lead.next_action_at!)}.</div>}

      {isStale(lead, full.now, full.stale_after_days) && (
        <div className="msg warn">
          Nothing has happened on this lead for{" "}
          <strong>{daysQuiet(lead.last_activity_at, full.now)} days</strong>. Adding a note, sending
          an email or moving the stage clears the flag.
        </div>
      )}

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
                  <th>Campaign</th>
                  <td>
                    {lead.form_name ? (
                      me.role === "admin" && lead.form_id ? (
                        <Link
                          href={`/campaigns/${lead.form_id}`}
                          style={{ color: "var(--p)", fontWeight: 600 }}
                        >
                          {lead.form_name}
                        </Link>
                      ) : (
                        lead.form_name
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
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
            <Notes leadId={lead.id} notes={notes} meId={me.id} serverNow={full.now} />
          </div>

          {emailSettings && (
            <EmailPanel
              leadId={lead.id}
              leadEmail={lead.email}
              unsubscribed={lead.unsubscribed}
              history={emailHistory}
              defaults={emailSettings.blocks_default}
              fromLabel={`${emailSettings.from_name} <${emailSettings.from_email}>`}
              canSend={hasPermission(me, "send_email")}
            />
          )}

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

        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          <Manage
            lead={lead}
            subs={subs}
            isAdmin={me.role === "admin"}
            pipeline={pipeline}
          />

          {hasPermission(me, "delete_leads") && <DeleteLead id={lead.id} name={lead.name} />}
        </div>
      </div>
    </>
  );
}

/**
 * Activity types are stored as machine keys, some of them multi-word
 * ("note_edited"). Underscores would otherwise show up in the timeline.
 */
function cap(s: string) {
  const words = s.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
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

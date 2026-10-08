import Link from "next/link";
import type { KbItem, MailThreadDetail, MessageTemplate } from "@/lib/types";
import MessageCard from "./message-card";
import ComposeForm from "./compose-form";
import MarkMailRead from "./mark-read";
import AddMailLead from "./add-lead";

/**
 * One conversation, oldest first like Gmail, with the newest message open and
 * the earlier ones folded to a line each. Reply sits underneath.
 */
export default function ThreadView({
  detail,
  templates,
  responses,
  meName,
  canAddLeads,
  noneSelected,
}: {
  detail: MailThreadDetail | null;
  templates: MessageTemplate[];
  responses: KbItem[];
  meName: string;
  canAddLeads: boolean;
  noneSelected: boolean;
}) {
  if (!detail) {
    return (
      <div
        className="mail-thread-pane"
        style={{ display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13, background: "#fafafc" }}
      >
        {noneSelected ? "Pick a conversation on the left." : "That conversation could not be opened. It may have been removed."}
      </div>
    );
  }

  const { thread, messages, lead, status } = detail;
  const last = messages.length - 1;
  // Who a reply goes to: the person on the other side, not the company's own address.
  const replyTo = thread.contact_email;

  return (
    <div
      className="mail-thread-pane"
      style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "#f3f3f6" }}
    >
      {thread.unread_count > 0 && <MarkMailRead id={thread.id} />}

      <div className="wa-thread-head">
        {/* On a phone the list and the conversation take turns; this is the way back. */}
        <Link href="/mail" className="mail-back">
          ← Inbox
        </Link>
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 14, color: "var(--ink)" }}>{thread.subject || "(no subject)"}</strong>
          {thread.is_new && (
            <span className="wa-first" title="Nobody here has replied yet">
              Not replied
            </span>
          )}
          <br />
          <small style={{ color: "var(--muted)" }}>
            {thread.display_name}
            {thread.contact_email && thread.display_name !== thread.contact_email ? ` · ${thread.contact_email}` : ""}
          </small>
        </div>
        <div className="spacer" />
        {lead && (
          <span
            className="pill"
            style={{
              background: lead.assigned_name ? undefined : "#fdf3e0",
              color: lead.assigned_name ? undefined : "#8a5a00",
            }}
          >
            {lead.assigned_name ? `Assigned: ${lead.assigned_name}` : "Unassigned"}
          </span>
        )}
        {lead ? (
          <Link href={`/leads/${lead.id}`} className="pill s-active">
            View lead
          </Link>
        ) : canAddLeads && thread.contact_email ? (
          <AddMailLead id={thread.id} />
        ) : (
          <span className="pill s-disabled">No lead linked</span>
        )}
      </div>

      <div className="mail-scroll">
        {messages.map((m, i) => (
          <MessageCard key={m.id} message={m} defaultOpen={i === last || m.is_unread} />
        ))}

        {status.has_gmail ? (
          <div className="mail-reply">
            <ComposeForm
              key={thread.id}
              threadId={thread.id}
              defaultTo={replyTo}
              templates={templates}
              responses={responses}
              meName={meName}
              vars={{ name: lead?.name || thread.contact_name, email: lead?.email || thread.contact_email }}
            />
          </div>
        ) : (
          <p className="empty" style={{ padding: 16 }}>
            The email connection is off, so replies cannot be sent from here.
          </p>
        )}
      </div>
    </div>
  );
}

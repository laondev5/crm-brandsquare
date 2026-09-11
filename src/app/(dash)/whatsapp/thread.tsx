import Link from "next/link";
import type { MessageTemplate, WaTemplate, WaThread } from "@/lib/types";
import MessageList from "./message-list";
import Composer from "./composer";
import MarkRead from "./mark-read";
import TemplatePicker from "./template-picker";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function Thread({
  thread,
  canSend,
  templates = [],
  quickReplies = [],
}: {
  thread: WaThread | null;
  canSend: boolean;
  templates?: WaTemplate[];
  quickReplies?: MessageTemplate[];
}) {
  if (!thread) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
          fontSize: 13,
          background: "#fafafc",
        }}
      >
        Pick a conversation on the left.
      </div>
    );
  }

  const { conversation, lead, messages } = thread;

  // WhatsApp's 24-hour rule: free text only reaches someone who wrote in the
  // last day. Past that, a typed reply fails at Meta, so say so before
  // anyone types one. (Approximate by up to the site's timezone offset.)
  const lastIn = [...messages].reverse().find((m) => m.direction === "in");
  const lastInAt = lastIn ? new Date(lastIn.created_at.replace(" ", "T")).getTime() : 0;
  const windowClosed = !lastIn || Date.now() - lastInAt > DAY_MS;
  const hasTemplates = templates.some((t) => t.status === "APPROVED");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "#f3f3f6" }}>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 14, color: "var(--ink)" }}>{conversation.display_name}</strong>
          <br />
          <small style={{ color: "var(--muted)" }}>+{conversation.phone}</small>
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
        ) : (
          <span className="pill s-disabled">No lead linked</span>
        )}
      </div>

      {conversation.unread_count > 0 && <MarkRead id={conversation.id} />}

      <MessageList conversationId={conversation.id} messages={messages} />

      {canSend && windowClosed && (
        <div
          style={{
            padding: "8px 14px",
            fontSize: 12,
            background: "#fdf6ea",
            color: "#854f0b",
            borderTop: "1px solid #eddcbc",
          }}
        >
          {lastIn ? "It has been more than 24 hours since they last wrote" : "They have not written to you yet"}
          , so WhatsApp will only deliver a template.{" "}
          {hasTemplates ? "Use the Template button below." : "An admin can create one on the Templates page."}
        </div>
      )}

      {canSend ? (
        <Composer
          conversationId={conversation.id}
          quickReplies={quickReplies}
          vars={{
            name: lead?.name || conversation.contact_name,
            email: lead?.email,
            phone: conversation.phone ? `+${conversation.phone}` : "",
          }}
          extra={
            hasTemplates ? (
              <TemplatePicker
                templates={templates}
                to={{ conversation_id: conversation.id }}
                contact={{
                  name: lead?.name || conversation.contact_name,
                  email: lead?.email,
                  phone: conversation.phone ? `+${conversation.phone}` : "",
                }}
              />
            ) : null
          }
        />
      ) : (
        <div style={{ borderTop: "1px solid var(--line)", padding: 14, textAlign: "center" }}>
          <small style={{ color: "var(--muted)" }}>
            You do not have permission to send WhatsApp messages.
          </small>
        </div>
      )}
    </div>
  );
}

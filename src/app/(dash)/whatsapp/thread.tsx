import Link from "next/link";
import type { WaThread } from "@/lib/types";
import MessageList from "./message-list";
import Composer from "./composer";
import MarkRead from "./mark-read";

export default function Thread({
  thread,
  canSend,
}: {
  thread: WaThread | null;
  canSend: boolean;
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

      {canSend ? (
        <Composer conversationId={conversation.id} />
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

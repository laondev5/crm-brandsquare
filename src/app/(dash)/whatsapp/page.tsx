import { requireUser } from "@/lib/auth";
import { hasPermission, waSignature } from "@/lib/types";
import { getWaConversations, getWaThread, listTemplates, listWaTemplates } from "@/lib/queries";
import ConversationList from "./conversation-list";
import Thread from "./thread";
import LiveInbox from "./live-inbox";

/**
 * One shared inbox, not one per admin. WhatsApp has a single business
 * number, so the list on the left is the same for everyone who opens this
 * page — picking up a thread here is closer to answering a phone at a shared
 * desk than to a personal mailbox.
 */
export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const selected = Number(sp.c) || null;

  let data;
  try {
    data = await getWaConversations(sp.q);
  } catch {
    return (
      <>
        <div className="head">
          <h1>WhatsApp</h1>
        </div>
        <div className="msg err">Could not load the inbox. Check the plugin is up to date.</div>
      </>
    );
  }

  const canSend = hasPermission(me, "send_whatsapp");
  const [thread, tpl, quickReplies] = await Promise.all([
    selected ? getWaThread(selected).catch(() => null) : Promise.resolve(null),
    canSend ? listWaTemplates().catch(() => null) : Promise.resolve(null),
    canSend ? listTemplates("whatsapp").catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <>
      <LiveInbox
        sig={waSignature(data.conversations, thread?.messages)}
        conversationId={selected}
        search={sp.q ?? ""}
      />

      <div className="head">
        <h1>WhatsApp</h1>
        {data.unread_total > 0 && (
          <span className="pill s-active" style={{ marginLeft: 10 }}>
            {data.unread_total} unread
          </span>
        )}
      </div>

      {!data.configured && (
        <div className="msg warn">
          No WhatsApp Business number is connected yet, so this is running in test mode — messages
          you send here are marked delivered locally rather than actually leaving. Everything else
          works the same way it will once a real number is connected.{" "}
          {hasPermission(me, "send_whatsapp") && <a href="/whatsapp/settings">Set it up</a>}
        </div>
      )}

      <div
        className="card"
        style={{
          padding: 0,
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          minHeight: 560,
          height: "calc(100vh - 220px)",
          overflow: "hidden",
        }}
      >
        <ConversationList
          conversations={data.conversations}
          selected={selected}
          search={sp.q ?? ""}
        />
        <Thread
          thread={thread}
          canSend={hasPermission(me, "send_whatsapp")}
          templates={tpl?.templates ?? []}
          quickReplies={quickReplies}
        />
      </div>
    </>
  );
}

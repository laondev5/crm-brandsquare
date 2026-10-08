import { requireUser } from "@/lib/auth";
import { hasPermission, isAdminRole, isSuperRole, waSignature } from "@/lib/types";
import { getWaConversations, getWaMode, getWaThread, listKb, listTemplates, listWaTemplates } from "@/lib/queries";
import ConversationList from "./conversation-list";
import Thread from "./thread";
import LiveInbox from "./live-inbox";
import ModeToggle from "./mode-toggle";

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

  // In the CRM, or on the phone. If the plugin cannot say, assume the CRM:
  // that is how this page has always worked.
  const mode = await getWaMode(me.id).catch(() => null);
  const internal = mode?.internal ?? true;

  const canSend = hasPermission(me, "send_whatsapp");
  // On the phone nothing is written from here, so nothing to write it with.
  const canWrite = canSend && internal;
  const [thread, tpl, quickReplies, responses] = await Promise.all([
    selected ? getWaThread(selected).catch(() => null) : Promise.resolve(null),
    canWrite ? listWaTemplates().catch(() => null) : Promise.resolve(null),
    canWrite ? listTemplates("whatsapp").catch(() => []) : Promise.resolve([]),
    canWrite ? listKb("response").catch(() => []) : Promise.resolve([]),
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
        <div className="spacer" />
        {mode && (
          <ModeToggle
            internal={internal}
            canSwitch={isSuperRole(me.role)}
            hasNumber={!!mode.external_digits}
          />
        )}
      </div>

      {!internal && (
        <div className="msg warn">
          <strong>WhatsApp is being used on the phone.</strong> This is an archive of what was said here before: you
          can read and search it, but new messages are written in the WhatsApp Business app.{" "}
          {mode?.external_number ? (
            <>
              Team number: <strong>{mode.external_number}</strong>.{" "}
            </>
          ) : null}
          The WhatsApp button on each lead opens that app on their chat.
        </div>
      )}

      {internal && !data.configured && (
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
          canDelete={isAdminRole(me.role)}
          canAddLeads={hasPermission(me, "add_leads")}
        />
        <Thread
          thread={thread}
          canSend={canWrite}
          archive={!internal}
          canDelete={isAdminRole(me.role)}
          canAddLeads={hasPermission(me, "add_leads")}
          canQuote={canWrite && (isAdminRole(me.role) || me.role === "subadmin")}
          templates={tpl?.templates ?? []}
          quickReplies={quickReplies}
          responses={responses}
          meName={me.name}
        />
      </div>
    </>
  );
}

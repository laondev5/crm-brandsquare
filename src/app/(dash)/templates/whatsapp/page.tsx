import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/types";
import { listTemplates, listWaTemplates } from "@/lib/queries";
import TemplateList from "@/app/(dash)/whatsapp/templates/template-list";
import SnippetManager from "../snippets";
import HowTo from "../how-to";

/**
 * WhatsApp's two kinds of saved message: templates Meta approves, which are
 * the only way to start a chat or pick one up after 24 hours, and quick
 * replies for chats that are already open.
 */
export default async function WhatsAppTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const me = await requireUser();
  const admin = isAdminRole(me.role);
  const sp = await searchParams;

  const [wa, snippets] = await Promise.all([
    listWaTemplates().catch(() => null),
    listTemplates("whatsapp").catch(() => []),
  ]);

  return (
    <>
      <div className="head">
        <h1>WhatsApp templates</h1>
        <div className="spacer" />
        {admin && (
          <Link href="/templates/whatsapp/new" className="btn">
            + New WhatsApp template
          </Link>
        )}
      </div>

      <HowTo
        title="WhatsApp templates"
        steps={[
          {
            title: "Know when you need one",
            body: (
              <>
                WhatsApp only lets you type freely to someone who messaged you in the last 24 hours.
                To send the <strong>first</strong> message to a lead, or to follow up after 24
                hours, you must send a template Meta has approved.
              </>
            ),
          },
          {
            title: "Start a new template",
            body: admin ? (
              <>
                Press <strong>+ New WhatsApp template</strong>. Give it a name you will recognise,
                choose <strong>Marketing</strong> (offers, follow-ups — most templates) or{" "}
                <strong>Utility</strong> (an update about something they asked for), and pick the
                language.
              </>
            ) : (
              <>Only an admin can create templates — ask one to add the message you need.</>
            ),
          },
          {
            title: "Add a header — optional",
            body: <>None, a bold line of text, or a picture (JPG or PNG, up to 5 MB).</>,
          },
          {
            title: "Write the message",
            body: (
              <>
                Press the field buttons — <em>First name</em>, <em>Company</em> and so on — to
                personalise it; they fill in from the lead. For anything else, such as the machine,
                type a name in <strong>Other field</strong>, press <strong>+ Add field</strong> and
                give an example.
              </>
            ),
          },
          {
            title: "Add a footer and buttons — optional",
            body: (
              <>
                <strong>Quick reply</strong> gives them a one-tap answer,{" "}
                <strong>Website link</strong> opens a page, <strong>Call number</strong> rings you.
                The preview on the right shows exactly what they will see.
              </>
            ),
          },
          {
            title: "Submit it for review",
            body: (
              <>
                Meta usually answers within minutes, and the card changes from <em>In review</em> to{" "}
                <em>Approved</em> by itself. If it is rejected, press <strong>Make a copy</strong>,
                change the wording and submit again.
              </>
            ),
          },
          {
            title: "Send it",
            body: (
              <>
                On a lead&rsquo;s page press <strong>Send template</strong> — that starts the
                WhatsApp chat. Inside a chat in the inbox, press <strong>Template</strong> next to
                Send. Pick one, check the preview, fill in anything missing, and send.
              </>
            ),
          },
        ]}
      />

      {sp.created && (
        <div className="msg ok">
          {sp.created === "APPROVED"
            ? "Template created and ready to send."
            : "Template sent to Meta for review. This page updates by itself when they answer."}
        </div>
      )}
      {!wa ? (
        <div className="msg err">Could not load WhatsApp templates. Check the plugin is up to date.</div>
      ) : (
        <>
          {!wa.configured && (
            <div className="msg warn">
              No WhatsApp number is connected, so templates are approved instantly here for testing.
              Once a real number is connected, new ones go to Meta for review.
            </div>
          )}
          {wa.sync_error && <div className="msg warn">Could not check with Meta for updates: {wa.sync_error}</div>}
          <TemplateList templates={wa.templates} canManage={admin} />
        </>
      )}

      <div style={{ marginTop: 36 }}>
        <div className="head" style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 18 }}>Quick replies</h1>
        </div>
        <HowTo
          title="Quick replies"
          steps={[
            {
              title: "For chats that are already open",
              body: (
                <>
                  When the customer wrote in the last 24 hours you can send anything, so these need
                  no approval. They just save you typing the same answer again.
                </>
              ),
            },
            { title: "Write and save it below", body: <>Use the field buttons for their name or company.</> },
            {
              title: "Use it in the inbox",
              body: (
                <>
                  Open the chat and choose it from <strong>Quick reply…</strong> above the message
                  box. It drops in with their details filled; change anything, then press Send.
                </>
              ),
            },
          ]}
        />
        <SnippetManager channel="whatsapp" templates={snippets} />
      </div>
    </>
  );
}

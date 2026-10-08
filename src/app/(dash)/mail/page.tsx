import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getMailList, getMailPulse, getMailThread, listKb, listTemplates } from "@/lib/queries";
import { hasPermission, isAdminRole, isSuperRole } from "@/lib/types";
import type { MailList, MailThreadDetail } from "@/lib/types";
import LiveMail from "./live-mail";
import MailListPane from "./mail-list";
import ThreadView from "./thread-view";
import ComposeButton from "./compose-button";
import SyncButton from "./sync-button";

/**
 * The company mailbox, as a shared inbox.
 *
 * Like the WhatsApp inbox, one list for everyone allowed in: a message that
 * arrives is anybody's to answer, and the thread says who the lead belongs to.
 * It reads and sends through the Gmail account connected under Settings →
 * Google account, so mail written here is in that mailbox's Sent folder too,
 * and mail answered in Gmail shows up here.
 */
export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; q?: string; f?: string; p?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;

  if (!hasPermission(me, "send_email")) {
    return (
      <>
        <div className="head">
          <h1>Email inbox</h1>
        </div>
        <div className="msg err">You do not have permission to use email. Ask an admin to turn it on for you.</div>
      </>
    );
  }

  const selected = Number(sp.t) || null;
  const filter = sp.f === "unread" || sp.f === "new" ? sp.f : "";
  const page = Math.max(1, Number(sp.p) || 1);
  const search = (sp.q ?? "").trim();

  // First, so anything it brings in from Gmail is in what is drawn below. A
  // failure here is not worth a blank page; the list below reports its own.
  const pulse = await getMailPulse(me, selected ?? undefined).catch(() => null);

  let list: MailList;
  try {
    list = await getMailList(me, { filter, search, page });
  } catch (e) {
    return (
      <>
        <div className="head">
          <h1>Email inbox</h1>
        </div>
        <div className="msg err">
          {e instanceof ApiError && e.status === 403
            ? e.message
            : "Could not load the inbox. Check the plugin is up to date (1.37 or newer)."}
        </div>
      </>
    );
  }

  const status = list.status;
  const [thread, templates, responses] = await Promise.all([
    selected ? getMailThread(me, selected).catch((): MailThreadDetail | null => null) : Promise.resolve(null),
    listTemplates("email").catch(() => []),
    listKb("response").catch(() => []),
  ]);

  return (
    <>
      <LiveMail sig={pulse?.sig ?? ""} threadId={selected} />

      <div className="head">
        <h1>Email inbox</h1>
        {list.unread_total > 0 && (
          <span className="pill s-active" style={{ marginLeft: 10 }}>
            {list.unread_total} unread
          </span>
        )}
        <div className="spacer" />
        {status.has_gmail && <SyncButton />}
        {status.has_gmail && <ComposeButton templates={templates} meName={me.name} />}
      </div>

      {!status.connected && (
        <div className="msg warn">
          No Google account is connected yet.{" "}
          {isSuperRole(me.role) ? (
            <Link href="/meetings/settings">Connect the company account</Link>
          ) : (
            "A super admin or the IT officer can connect it under Settings → Google account."
          )}
        </div>
      )}
      {status.connected && !status.has_gmail && (
        <div className="msg warn">
          The connected account ({status.account}) has not given the CRM access to its email.{" "}
          {isSuperRole(me.role) ? (
            <Link href="/meetings/settings">Connect it again with the email box ticked</Link>
          ) : (
            "A super admin or the IT officer needs to connect it again with email access."
          )}
        </div>
      )}
      {status.has_gmail && status.importing && (
        <div className="msg ok">
          Bringing in mail from <strong>{status.mail_account || status.account}</strong> &mdash;{" "}
          {status.imported.toLocaleString()} messages so far. It carries on by itself while this page is open.
        </div>
      )}
      {status.has_gmail && status.last_error && (
        <div className="msg err">
          Gmail reported a problem: {status.last_error}{" "}
          {isSuperRole(me.role) && <Link href="/meetings/settings">Google account settings</Link>}
        </div>
      )}

      <div
        className="card mail-desk"
        data-open={selected ? "thread" : "list"}
        style={{
          padding: 0,
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          minHeight: 560,
          height: "calc(100vh - 220px)",
          overflow: "hidden",
        }}
      >
        <MailListPane
          data={list}
          selected={selected}
          search={search}
          filter={filter}
          page={page}
          canAddLeads={hasPermission(me, "add_leads")}
          canRemove={isAdminRole(me.role)}
        />
        <ThreadView
          detail={thread}
          templates={templates}
          responses={responses}
          meName={me.name}
          canAddLeads={hasPermission(me, "add_leads")}
          noneSelected={!selected}
        />
      </div>
    </>
  );
}

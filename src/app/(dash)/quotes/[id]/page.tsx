import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getQuote, getWaMode } from "@/lib/queries";
import { hasPermission, isAdminRole } from "@/lib/types";
import QuoteEditor from "../editor";
import SendQuote from "./send";
import QuoteStatus from "./status";
import RaiseInvoice from "./raise";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;

  const data = await getQuote(Number(id)).catch(() => null);
  if (!data?.quote) notFound();
  const quote = data.quote;

  const canWrite = isAdminRole(me.role) || me.role === "subadmin";
  const waMode = hasPermission(me, "send_whatsapp") ? await getWaMode(me.id).catch(() => null) : null;

  return (
    <>
      <div className="head">
        <h1>
          {quote.ref}
          <span className={`pill s-${quote.status}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>
            {quote.status_label}
          </span>
        </h1>
        <div className="spacer" />
        {quote.lead_id && (
          <Link href={`/leads/${quote.lead_id}`} className="btn ghost">
            The lead
          </Link>
        )}
        {quote.conversation_id && (
          <Link href={`/whatsapp?c=${quote.conversation_id}`} className="btn ghost">
            The chat
          </Link>
        )}
        {quote.org_id && (
          <Link href={`/organizations/${quote.org_id}`} className="btn ghost">
            The organisation
          </Link>
        )}
        <Link href="/quotes" className="btn ghost">
          All quotations
        </Link>
      </div>

      <QuoteEditor quote={quote} canEdit={canWrite} />

      <div className="doc-form__footcards">
        <div className="card">
          <h2>Record</h2>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            Written by {quote.created_by_name || "—"} on {quote.created_at?.slice(0, 10)}
            {quote.sent_at ? `, sent ${quote.sent_at.slice(0, 10)}` : ""}.
          </p>
        </div>

        <SendQuote
          quote={quote}
          meName={me.name}
          canSend={canWrite && hasPermission(me, "send_whatsapp")}
          external={!!waMode && !waMode.internal}
        />

        {canWrite && (
          <div className="card">
            <h2>From this quotation</h2>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              Once they agree, raise the proforma invoice from these same lines. Nothing is retyped,
              and pressing it again returns the invoice already written.
            </p>
            <RaiseInvoice quoteId={quote.id} canWrite={canWrite} />
          </div>
        )}

        {canWrite && <QuoteStatus quote={quote} canDelete={isAdminRole(me.role)} />}
      </div>
    </>
  );
}

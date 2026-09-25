import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getQuote } from "@/lib/queries";
import { hasPermission, isAdminRole, money } from "@/lib/types";
import QuoteEditor from "../editor";
import SendQuote from "./send";
import QuoteStatus from "./status";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;

  const data = await getQuote(Number(id)).catch(() => null);
  if (!data?.quote) notFound();
  const quote = data.quote;

  const canWrite = isAdminRole(me.role) || me.role === "subadmin";

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
        <Link href="/quotes" className="btn ghost">
          All quotations
        </Link>
      </div>

      <div className="qt-page">
        <div className="qt-page__main">
          <QuoteEditor quote={quote} canEdit={canWrite} />
        </div>

        <aside className="qt-page__side">
          <div className="card">
            <h2>What it comes to</h2>
            <dl className="qt-summary">
              <div>
                <dt>Subtotal</dt>
                <dd>{money(quote.subtotal, quote.currency)}</dd>
              </div>
              {quote.tax_percent > 0 && (
                <div>
                  <dt>VAT {quote.tax_percent}%</dt>
                  <dd>{money(quote.tax_amount, quote.currency)}</dd>
                </div>
              )}
              <div className="qt-summary__grand">
                <dt>Total</dt>
                <dd>{money(quote.total, quote.currency)}</dd>
              </div>
            </dl>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Written by {quote.created_by_name || "—"} on{" "}
              {quote.created_at?.slice(0, 10)}
              {quote.sent_at ? `, sent ${quote.sent_at.slice(0, 10)}` : ""}.
            </p>
          </div>

          <SendQuote
            quote={quote}
            meName={me.name}
            canSend={canWrite && hasPermission(me, "send_whatsapp")}
          />

          {canWrite && <QuoteStatus quote={quote} canDelete={isAdminRole(me.role)} />}
        </aside>
      </div>
    </>
  );
}

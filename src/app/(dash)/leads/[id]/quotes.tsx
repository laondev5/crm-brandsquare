import Link from "next/link";
import { money, type Quote } from "@/lib/types";

/**
 * Quotations written for this lead.
 *
 * Sits on the lead because that is where the conversation about price
 * happens — what was quoted, for how much, and whether it came back.
 */
export default function LeadQuotes({
  leadId,
  quotes,
  canWrite,
}: {
  leadId: number;
  quotes: Quote[];
  canWrite: boolean;
}) {
  return (
    <div className="card">
      <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Quotations</h2>
        {quotes.length > 0 && <span className="pill s-active">{quotes.length}</span>}
        <div style={{ flex: 1 }} />
        {canWrite && (
          <Link href={`/quotes/new?lead=${leadId}`} className="btn ghost sm">
            + New quotation
          </Link>
        )}
      </div>

      {quotes.length === 0 ? (
        <p className="empty" style={{ padding: "10px 0", margin: 0 }}>
          None yet. Write one when you know what they need and what it costs.
        </p>
      ) : (
        <ul className="notif-list">
          {quotes.map((quote) => (
            <li key={quote.id} className="notif">
              <span className="notif__icon" aria-hidden="true">₦</span>
              <div className="notif__main">
                <Link href={`/quotes/${quote.id}`} className="notif__title" style={{ display: "block" }}>
                  {quote.ref} · {money(quote.total, quote.currency)}
                </Link>
                <div className="notif__body">
                  {quote.status_label}
                  {quote.items.length > 0 && ` · ${quote.items.length} line${quote.items.length === 1 ? "" : "s"}`}
                  {quote.valid_until ? ` · valid until ${quote.valid_until}` : ""}
                </div>
                <div className="notif__time">
                  {quote.created_by_name ? `${quote.created_by_name}, ` : ""}
                  {quote.created_at?.slice(0, 10)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { listQuotes } from "@/lib/queries";
import { isAdminRole, money, QUOTE_STATUSES, type QuoteStatus } from "@/lib/types";

/**
 * Every quotation the business has written.
 *
 * Kept as its own list rather than only hanging off leads, because "what have
 * we quoted this month, and what came back" is a question about the business
 * rather than about one customer.
 */
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; mine?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const status = (QUOTE_STATUSES.find((s) => s.key === sp.status)?.key ?? "") as QuoteStatus | "";
  const mine = sp.mine === "1";

  const data = await listQuotes(me, { status: status || undefined, q: sp.q, mine }).catch(() => null);
  const canWrite = isAdminRole(me.role) || me.role === "subadmin";

  const tab = (key: string, label: string, count?: number) => {
    const params = new URLSearchParams();
    if (key) params.set("status", key);
    if (sp.q) params.set("q", sp.q);
    if (mine) params.set("mine", "1");
    const href = `/quotes${params.toString() ? `?${params}` : ""}`;
    return (
      <Link key={key || "all"} href={href} className={`seg__btn${status === key ? " is-on" : ""}`}>
        {label}
        {typeof count === "number" && <span className="seg__count">{count}</span>}
      </Link>
    );
  };

  return (
    <>
      <div className="head">
        <h1>Quotations</h1>
        <div className="spacer" />
        {canWrite && (
          <Link href="/quotes/new" className="btn">
            + New quotation
          </Link>
        )}
      </div>

      {!data ? (
        <div className="msg err">
          Could not load quotations. The plugin needs to be version 1.35 or newer.
        </div>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 14 }}>
            {tab("", "All", data.counts.all)}
            {QUOTE_STATUSES.map((s) => tab(s.key, s.label, data.counts[s.key]))}
          </div>

          <form className="row" style={{ gap: 8, marginBottom: 14 }}>
            {status && <input type="hidden" name="status" value={status} />}
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search a customer, company or number"
              style={{ flex: 1, maxWidth: 340 }}
            />
            <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} />
              Mine only
            </label>
            <button className="btn ghost sm">Search</button>
          </form>

          {data.quotes.length === 0 ? (
            <p className="empty" style={{ padding: 28 }}>
              {sp.q || status || mine
                ? "No quotation matches that."
                : "No quotations yet. Write one from a lead, from a WhatsApp chat, or with the button above."}
            </p>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Customer</th>
                    <th>Written</th>
                    <th>Valid until</th>
                    <th>By</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td>
                        <Link href={`/quotes/${quote.id}`} style={{ fontWeight: 600 }}>
                          {quote.ref}
                        </Link>
                      </td>
                      <td>
                        {quote.customer_name || "—"}
                        {quote.customer_company && (
                          <>
                            <br />
                            <small style={{ color: "var(--muted)" }}>{quote.customer_company}</small>
                          </>
                        )}
                      </td>
                      <td className="tbl-keep">{quote.issued_on ?? quote.created_at?.slice(0, 10)}</td>
                      <td className="tbl-keep">{quote.valid_until ?? "—"}</td>
                      <td className="tbl-keep">{quote.created_by_name || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {money(quote.total, quote.currency)}
                      </td>
                      <td>
                        <span className={`pill s-${quote.status}`}>{quote.status_label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { listInvoices } from "@/lib/queries";
import { INVOICE_STATUSES, isAdminRole, money, type InvoiceStatus } from "@/lib/types";

/**
 * Every proforma invoice, with what has been received against it.
 *
 * Kept beside the quotations because they are the same sale at two stages:
 * the quotation asks, the invoice asks for the money, the receipt says it
 * arrived.
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; mine?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const status = (INVOICE_STATUSES.find((s) => s.key === sp.status)?.key ?? "") as InvoiceStatus | "";
  const mine = sp.mine === "1";

  const data = await listInvoices(me, { status: status || undefined, q: sp.q, mine }).catch(() => null);
  const canWrite = isAdminRole(me.role) || me.role === "subadmin";

  const tab = (key: string, label: string, count?: number) => {
    const params = new URLSearchParams();
    if (key) params.set("status", key);
    if (sp.q) params.set("q", sp.q);
    if (mine) params.set("mine", "1");
    const href = `/invoices${params.toString() ? `?${params}` : ""}`;
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
        <h1>Invoices</h1>
        <div className="spacer" />
        {canWrite && (
          <Link href="/invoices/new" className="btn">
            + New invoice
          </Link>
        )}
      </div>

      {!data ? (
        <div className="msg err">
          Could not load invoices. The plugin needs to be version 1.38 or newer.
        </div>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 14 }}>
            {tab("", "All", data.counts.all)}
            {INVOICE_STATUSES.map((s) => tab(s.key, s.label, data.counts[s.key]))}
          </div>

          <form className="row" style={{ gap: 8, marginBottom: 14 }}>
            {status && <input type="hidden" name="status" value={status} />}
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search a customer, company or invoice number"
              style={{ flex: 1, maxWidth: 360 }}
            />
            <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} />
              Mine only
            </label>
            <button className="btn ghost sm">Search</button>
          </form>

          {data.invoices.length === 0 ? (
            <p className="empty" style={{ padding: 28 }}>
              {sp.q || status || mine
                ? "No invoice matches that."
                : "No invoices yet. Raise one from a quotation, or with the button above."}
            </p>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Customer</th>
                    <th>Issued</th>
                    <th>Valid until</th>
                    <th>By</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <Link href={`/invoices/${invoice.id}`} style={{ fontWeight: 600 }}>
                          {invoice.invoice_no}
                        </Link>
                      </td>
                      <td>
                        {invoice.customer_name || "—"}
                        {invoice.customer_company && (
                          <>
                            <br />
                            <small style={{ color: "var(--muted)" }}>{invoice.customer_company}</small>
                          </>
                        )}
                      </td>
                      <td className="tbl-keep">{invoice.issued_on ?? invoice.created_at?.slice(0, 10)}</td>
                      <td className="tbl-keep">{invoice.valid_until ?? "—"}</td>
                      <td className="tbl-keep">{invoice.created_by_name || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {money(invoice.total, invoice.currency)}
                      </td>
                      <td>
                        <span className={`pill s-${invoice.status}`}>{invoice.status_label}</span>
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

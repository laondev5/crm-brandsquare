import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listReceipts } from "@/lib/queries";
import { isAdminRole, money } from "@/lib/types";
import TablePager, { PAGE_SIZE, pageHref, pageOf } from "@/components/table-pager";

/**
 * Every payment the business has confirmed.
 *
 * The receipts list is its own record because a receipt is a different claim
 * from an invoice: the invoice asks, the receipt says the money arrived.
 */
export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; invoice?: string; org?: string; page?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const invoiceId = Number(sp.invoice) || undefined;
  const orgId = Number(sp.org) || undefined;

  const requested = Math.max(1, Number(sp.page) || 1);
  const filters = {
    q: sp.q,
    invoice: invoiceId ? String(invoiceId) : undefined,
    org: orgId ? String(orgId) : undefined,
  };

  const data = await listReceipts(me, { q: sp.q, invoice: invoiceId, org: orgId }, {
    limit: PAGE_SIZE,
    offset: (requested - 1) * PAGE_SIZE,
  }).catch(() => null);
  const canWrite = isAdminRole(me.role) || me.role === "subadmin";

  const view = pageOf(data?.receipts ?? [], data?.total, requested);
  // A hand-edited page past the end is sent to the last page it can show.
  if (data?.total !== undefined && requested !== view.page) {
    redirect(pageHref("/receipts", filters, view.page));
  }

  const newHref = invoiceId
    ? `/receipts/new?invoice=${invoiceId}`
    : orgId
      ? `/receipts/new?org=${orgId}`
      : "/receipts/new";

  return (
    <>
      <div className="head">
        <h1>Receipts</h1>
        <div className="spacer" />
        {canWrite && (
          <Link href={newHref} className="btn">
            + New receipt
          </Link>
        )}
      </div>

      {!data ? (
        <div className="msg err">
          Could not load receipts. The plugin needs to be version 1.38 or newer.
        </div>
      ) : (
        <>
          <form className="row" style={{ gap: 8, marginBottom: 14 }}>
            {invoiceId && <input type="hidden" name="invoice" value={invoiceId} />}
            {orgId && <input type="hidden" name="org" value={orgId} />}
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search a customer, receipt number or reference"
              style={{ flex: 1, maxWidth: 360 }}
            />
            <button className="btn ghost sm">Search</button>
          </form>

          {data.receipts.length === 0 ? (
            <p className="empty" style={{ padding: 28 }}>
              {sp.q || invoiceId || orgId
                ? "No receipt matches that."
                : "No receipts yet. Record one from an invoice, or with the button above."}
            </p>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Customer</th>
                    <th>Against invoice</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th style={{ textAlign: "right" }}>Received</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>
                        <Link href={`/receipts/${receipt.id}`} style={{ fontWeight: 600 }}>
                          {receipt.receipt_no}
                        </Link>
                      </td>
                      <td>
                        {receipt.customer_name || "—"}
                        {receipt.customer_company && (
                          <>
                            <br />
                            <small style={{ color: "var(--muted)" }}>{receipt.customer_company}</small>
                          </>
                        )}
                      </td>
                      <td className="tbl-keep">
                        {receipt.invoice_id ? (
                          <Link href={`/invoices/${receipt.invoice_id}`}>{receipt.invoice_no}</Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tbl-keep">{receipt.receipt_date ?? receipt.created_at?.slice(0, 10)}</td>
                      <td className="tbl-keep">{receipt.payment_method || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {money(receipt.amount_received, receipt.currency)}
                      </td>
                      <td className="tbl-keep">{receipt.created_by_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <TablePager
                page={view.page}
                pageCount={view.pageCount}
                total={view.total}
                basePath="/receipts"
                params={filters}
                label="Receipt"
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

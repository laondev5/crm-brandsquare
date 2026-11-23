import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getDocSettings, getInvoice } from "@/lib/queries";
import { isAdminRole, money } from "@/lib/types";
import InvoiceEditor from "../editor";
import InvoiceControls from "./controls";
import { InvoicePdfButton } from "../../doc-pdf-button";
import DeleteDocument from "../../delete-document";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;

  const [data, settings] = await Promise.all([
    getInvoice(Number(id)).catch(() => null),
    getDocSettings().catch(() => null),
  ]);
  if (!data?.invoice) notFound();
  const invoice = data.invoice;

  const canWrite = isAdminRole(me.role) || me.role === "subadmin";
  const paid = invoice.paid_total ?? 0;
  const owed = invoice.balance ?? Math.max(0, invoice.total - paid);

  return (
    <>
      <div className="head">
        <h1>
          {invoice.invoice_no}
          <span className={`pill s-${invoice.status}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>
            {invoice.status_label}
          </span>
        </h1>
        <div className="spacer" />
        {invoice.quote_id && (
          <Link href={`/quotes/${invoice.quote_id}`} className="btn ghost">
            The quotation
          </Link>
        )}
        {invoice.org_id && (
          <Link href={`/organizations/${invoice.org_id}`} className="btn ghost">
            The organisation
          </Link>
        )}
        {invoice.lead_id && (
          <Link href={`/leads/${invoice.lead_id}`} className="btn ghost">
            The lead
          </Link>
        )}
        <InvoicePdfButton invoice={invoice} settings={settings?.settings ?? null} />
      </div>

      <InvoiceEditor invoice={invoice} defaults={settings?.settings ?? null} canEdit={canWrite} />

      <div className="doc-form__footcards">
        <div className="card">
          <h2>Payment</h2>
          <dl className="qt-summary">
            <div>
              <dt>Received</dt>
              <dd>{money(paid, invoice.currency)}</dd>
            </div>
            <div>
              <dt>Still owed</dt>
              <dd>{money(owed, invoice.currency)}</dd>
            </div>
          </dl>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
            Written by {invoice.created_by_name || "—"} on {invoice.created_at?.slice(0, 10)}
            {invoice.sent_at ? `, sent ${invoice.sent_at.slice(0, 10)}` : ""}.
          </p>
        </div>

        {canWrite && <InvoiceControls invoice={invoice} />}

        <div className="card">
          <h2>Receipts against this invoice</h2>
          {!invoice.receipts?.length ? (
            <p className="empty" style={{ padding: "8px 0", margin: 0 }}>
              Nothing received yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {invoice.receipts.map((receipt) => (
                <div key={receipt.id} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  <Link href={`/receipts/${receipt.id}`} style={{ fontWeight: 600 }}>
                    {receipt.receipt_no}
                  </Link>
                  <br />
                  <small style={{ color: "var(--muted)" }}>
                    {money(receipt.amount_received, receipt.currency)} ·{" "}
                    {receipt.receipt_date?.slice(0, 10) || "—"}
                    {receipt.payment_method ? ` · ${receipt.payment_method}` : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {isAdminRole(me.role) && (
          <div className="card">
            <h2>Danger</h2>
            <DeleteDocument
              kind="invoice"
              id={invoice.id}
              what={invoice.invoice_no}
              redirectTo="/invoices"
              label="Delete this invoice"
            />
          </div>
        )}
      </div>
    </>
  );
}

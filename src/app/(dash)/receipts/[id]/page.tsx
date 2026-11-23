import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getDocSettings, getReceipt } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import ReceiptEditor from "../editor";
import { ReceiptPdfButton } from "../../doc-pdf-button";
import DeleteDocument from "../../delete-document";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;

  const [data, settings] = await Promise.all([
    getReceipt(Number(id)).catch(() => null),
    getDocSettings().catch(() => null),
  ]);
  if (!data?.receipt) notFound();
  const receipt = data.receipt;

  const canWrite = isAdminRole(me.role) || me.role === "subadmin";

  return (
    <>
      <div className="head">
        <h1>{receipt.receipt_no}</h1>
        <div className="spacer" />
        {receipt.invoice_id && (
          <Link href={`/invoices/${receipt.invoice_id}`} className="btn ghost">
            The invoice
          </Link>
        )}
        {receipt.org_id && (
          <Link href={`/organizations/${receipt.org_id}`} className="btn ghost">
            The organisation
          </Link>
        )}
        {receipt.lead_id && (
          <Link href={`/leads/${receipt.lead_id}`} className="btn ghost">
            The lead
          </Link>
        )}
        <ReceiptPdfButton receipt={receipt} settings={settings?.settings ?? null} />
      </div>

      <ReceiptEditor receipt={receipt} defaults={settings?.settings ?? null} canEdit={canWrite} />

      <div className="doc-form__footcards">
        {receipt.invoice_id && (
          <div className="card">
            <h2>Against</h2>
            <dl className="qt-summary">
              <div>
                <dt>Invoice</dt>
                <dd>
                  <Link href={`/invoices/${receipt.invoice_id}`}>{receipt.invoice_no}</Link>
                </dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{receipt.payment_method || "—"}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{receipt.payment_reference || "—"}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="card">
          <h2>Record</h2>
          <dl className="qt-summary">
            <div>
              <dt>Recorded by</dt>
              <dd>{receipt.created_by_name || "—"}</dd>
            </div>
            <div>
              <dt>Written</dt>
              <dd>{receipt.created_at?.slice(0, 10) || "—"}</dd>
            </div>
            <div>
              <dt>Last change</dt>
              <dd>{receipt.updated_at?.slice(0, 10) || "—"}</dd>
            </div>
          </dl>
        </div>

        {isAdminRole(me.role) && (
          <div className="card">
            <h2>Danger</h2>
            <DeleteDocument
              kind="receipt"
              id={receipt.id}
              what={receipt.receipt_no}
              redirectTo="/receipts"
              label="Delete this receipt"
            />
          </div>
        )}
      </div>
    </>
  );
}

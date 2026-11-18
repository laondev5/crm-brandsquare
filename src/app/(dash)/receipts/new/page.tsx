import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getDocSettings, getInvoice, getLeadFull, getOrganization } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import ReceiptEditor from "../editor";

/**
 * A blank receipt, filled in from the invoice it settles where there is one.
 *
 * Everything the invoice already knows — customer, lines, what is still owed —
 * is put on the form, so recording a payment is checking the figures rather
 * than retyping them.
 */
export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string; org?: string; lead?: string }>;
}) {
  const me = await requireMember();
  if (!isAdminRole(me.role) && me.role !== "subadmin") notFound();

  const sp = await searchParams;
  const invoiceId = Number(sp.invoice) || null;
  const orgId = Number(sp.org) || null;
  const leadId = Number(sp.lead) || null;

  const [invoice, org, lead, settings] = await Promise.all([
    invoiceId ? getInvoice(invoiceId).catch(() => null) : Promise.resolve(null),
    orgId ? getOrganization(me, orgId).catch(() => null) : Promise.resolve(null),
    leadId ? getLeadFull(leadId).catch(() => null) : Promise.resolve(null),
    getDocSettings().catch(() => null),
  ]);

  const inv = invoice?.invoice ?? null;
  const orgRow = org?.organization ?? null;
  const leadRow = lead?.lead ?? null;

  const owed = inv ? (inv.balance ?? Math.max(0, inv.total - (inv.paid_total ?? 0))) : undefined;

  const prefill = {
    invoice_id: inv?.id ?? null,
    org_id: inv?.org_id ?? orgRow?.id ?? null,
    lead_id: inv?.lead_id ?? leadRow?.id ?? null,
    customer_name: inv?.customer_name || orgRow?.contact_name || leadRow?.name || "",
    customer_company: inv?.customer_company || orgRow?.name || leadRow?.company || "",
    customer_email: inv?.customer_email || orgRow?.contact_email || leadRow?.email || "",
    customer_phone: inv?.customer_phone || orgRow?.contact_phone || leadRow?.phone || "",
    currency: inv?.currency,
    amount_received: owed,
    order_total: inv?.total,
    summary: inv ? `Part payment towards invoice ${inv.invoice_no}.` : "",
    items: inv?.items.map((item) => ({
      description: item.description,
      qty: item.qty,
      line_total: item.line_total,
    })),
  };

  return (
    <>
      <div className="head">
        <h1>New receipt</h1>
        <div className="spacer" />
        {inv && (
          <Link href={`/invoices/${inv.id}`} className="btn ghost">
            The invoice
          </Link>
        )}
        {prefill.org_id && (
          <Link href={`/organizations/${prefill.org_id}`} className="btn ghost">
            The organisation
          </Link>
        )}
        <Link href="/receipts" className="btn ghost">
          All receipts
        </Link>
      </div>

      <ReceiptEditor prefill={prefill} defaults={settings?.settings ?? null} canEdit />
    </>
  );
}

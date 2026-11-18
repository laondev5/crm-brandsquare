import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getDocSettings, getLeadFull, getOrganization } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import InvoiceEditor from "../editor";

/**
 * A blank proforma invoice.
 *
 * Opened from an organisation or a lead so the customer is already on it, and
 * carrying the company's bank details from the document settings. The lines
 * and the money are still typed by the rep.
 */
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; lead?: string }>;
}) {
  const me = await requireMember();
  if (!isAdminRole(me.role) && me.role !== "subadmin") notFound();

  const sp = await searchParams;
  const orgId = Number(sp.org) || null;
  const leadId = Number(sp.lead) || null;

  const [org, lead, settings] = await Promise.all([
    orgId ? getOrganization(me, orgId).catch(() => null) : Promise.resolve(null),
    leadId ? getLeadFull(leadId).catch(() => null) : Promise.resolve(null),
    getDocSettings().catch(() => null),
  ]);

  const orgRow = org?.organization ?? null;
  const leadRow = lead?.lead ?? null;

  const prefill = {
    org_id: orgRow?.id ?? null,
    lead_id: leadRow?.id ?? null,
    customer_name: orgRow?.contact_name || leadRow?.name || "",
    customer_company: orgRow?.name || leadRow?.company || "",
    customer_location: orgRow ? orgRow.location || orgRow.country : "",
    customer_email: orgRow?.contact_email || leadRow?.email || "",
    customer_phone: orgRow?.contact_phone || leadRow?.phone || "",
  };

  return (
    <>
      <div className="head">
        <h1>New invoice</h1>
        <div className="spacer" />
        {prefill.lead_id && (
          <Link href={`/leads/${prefill.lead_id}`} className="btn ghost">
            The lead
          </Link>
        )}
        {prefill.org_id && (
          <Link href={`/organizations/${prefill.org_id}`} className="btn ghost">
            The organisation
          </Link>
        )}
        <Link href="/invoices" className="btn ghost">
          All invoices
        </Link>
      </div>

      <p className="board-hint">
        The bank details below come from the document settings, so every invoice asks for payment
        into the right account. Change them here if this one is different — the settings themselves
        stay as they are.
      </p>

      <InvoiceEditor prefill={prefill} defaults={settings?.settings ?? null} canEdit />
    </>
  );
}

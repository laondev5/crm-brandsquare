import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getDocSettings, getLeadFull, getOrganization, getWaThread } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import QuoteEditor from "../editor";

/**
 * A blank quotation, with the customer already on it.
 *
 * Reached from a lead or from a WhatsApp thread, and in both cases the point
 * is that nobody retypes a name and a number that the CRM already has. The
 * figures are another matter: those are the rep's, every time.
 */
export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; c?: string; org?: string }>;
}) {
  const me = await requireMember();
  if (!isAdminRole(me.role) && me.role !== "subadmin") notFound();

  const sp = await searchParams;
  const leadId = Number(sp.lead) || null;
  const conversationId = Number(sp.c) || null;
  const orgId = Number(sp.org) || null;

  const [lead, thread, org, settings] = await Promise.all([
    leadId ? getLeadFull(leadId).catch(() => null) : Promise.resolve(null),
    conversationId ? getWaThread(conversationId).catch(() => null) : Promise.resolve(null),
    orgId ? getOrganization(me, orgId).catch(() => null) : Promise.resolve(null),
    getDocSettings().catch(() => null),
  ]);

  // A thread usually knows its lead, and the lead has the fuller record.
  const fromLead = lead?.lead ?? null;
  const threadLead = thread?.lead ?? null;

  const orgRow = org?.organization ?? null;
  const prefill = {
    lead_id: leadId ?? threadLead?.id ?? null,
    conversation_id: conversationId,
    org_id: orgRow?.id ?? null,
    name: fromLead?.name || threadLead?.name || thread?.conversation.contact_name || orgRow?.contact_name || "",
    company: orgRow?.name || fromLead?.company || "",
    email: fromLead?.email || threadLead?.email || orgRow?.contact_email || "",
    phone: fromLead?.phone || (thread?.conversation.phone ? `+${thread.conversation.phone}` : "") || orgRow?.contact_phone || "",
  };

  return (
    <>
      <div className="head">
        <h1>New quotation</h1>
        <div className="spacer" />
        {prefill.lead_id && (
          <Link href={`/leads/${prefill.lead_id}`} className="btn ghost">
            The lead
          </Link>
        )}
        {conversationId && (
          <Link href={`/whatsapp?c=${conversationId}`} className="btn ghost">
            The chat
          </Link>
        )}
        {prefill.org_id && (
          <Link href={`/organizations/${prefill.org_id}`} className="btn ghost">
            The organisation
          </Link>
        )}
        <Link href="/quotes" className="btn ghost">
          All quotations
        </Link>
      </div>

      <p className="board-hint">
        Every figure here is yours to type — there is no price list behind this. Describe what you
        are quoting for, put the quantity and the price against it, and the totals follow.
      </p>

      <QuoteEditor prefill={prefill} defaults={settings?.settings ?? null} canEdit />
    </>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  addNote,
  bulkCreateLeads,
  getLeadFull,
  logWhatsAppOpen,
  sendLeadEmail,
  updateLead,
  type LeadUpdate,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import {
  LEAD_STATUSES,
  hasPermission,
  type LeadStatus,
  type BulkLeadRow,
  type BulkImportResult,
  type EmailBlocks,
} from "@/lib/types";
import type { FormState } from "./auth";

export async function updateLeadAction(form: FormData) {
  const me = await requireUser();
  const id = Number(form.get("id"));

  // Sub-admins may only touch their own leads. Their id is sent as the scope,
  // and the plugin puts it in the WHERE clause — a forged id finds nothing.
  const scope = me.role === "admin" ? null : me.id;

  const current = await getLeadFull(id, scope);
  if (!current) return;

  const patch: LeadUpdate = {};

  const status = String(form.get("status") ?? "") as LeadStatus;
  if (status && status !== current.lead.status && LEAD_STATUSES.some((s) => s.key === status)) {
    patch.status = status;
  }

  // Reassignment is an admin-only power, so the field is only ever sent by one.
  if (me.role === "admin") {
    const raw = form.get("assigned_to");
    if (raw !== null) {
      const ownerId = Number(raw) || null;
      if (ownerId !== current.lead.assigned_to) patch.assigned_to = ownerId;
    }
  }

  const next = String(form.get("next_action_at") ?? "").trim();
  patch.next_action_at = next || null;

  if (Object.keys(patch).length) {
    await updateLead(id, me, patch, scope);
  }

  const note = String(form.get("note") ?? "").trim();
  if (note) await addNote(id, me, note.slice(0, 5000));

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/");
}

export type AddLeadState = FormState & { leadCreated?: boolean };

export async function addLeadAction(_prev: AddLeadState, form: FormData): Promise<AddLeadState> {
  const me = await requireUser();

  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  if (!name && !email && !phone) {
    return { error: "Enter at least a name, email or phone number." };
  }

  const labels = form.getAll("field_label") as string[];
  const values = form.getAll("field_value") as string[];
  const answers = labels
    .map((label, i) => ({ label: label.trim(), value: (values[i] ?? "").trim() }))
    .filter((a) => a.label && a.value);

  const status = String(form.get("status") ?? "new") as LeadStatus;
  const formName = String(form.get("campaign_name") ?? "").trim();
  const formIdRaw = form.get("campaign_id");
  const assignedRaw = form.get("assigned_to");

  const row: BulkLeadRow = {
    name,
    email,
    phone,
    answers,
    status: LEAD_STATUSES.some((s) => s.key === status) ? status : "new",
    note: String(form.get("note") ?? "").trim() || undefined,
  };

  // Admins choose who gets it (or leave it unassigned); a sub-admin only ever
  // adds to their own list — enforced here by which field the form even sent.
  let selfAssignTo: number | null = null;
  if (me.role === "admin") {
    if (assignedRaw === "unassigned") row.unassigned = true;
    else if (assignedRaw) row.assigned_to = Number(assignedRaw) || undefined;
  } else {
    selfAssignTo = me.id;
  }

  try {
    const res = await bulkCreateLeads({
      rows: [row],
      formId: formIdRaw ? Number(formIdRaw) : null,
      formName,
      selfAssignTo,
      actor: me,
      context: "manual",
    });

    if (!res.created) {
      return { error: res.skipped[0]?.reason ?? "That row could not be saved." };
    }

    revalidatePath("/leads");
    revalidatePath("/");
    if (res.campaign_id) revalidatePath(`/campaigns/${res.campaign_id}`);
    return { ok: "Lead added.", leadCreated: true };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    throw e;
  }
}

/**
 * Called directly from the import UI (not bound to a <form>), so it can take
 * a large parsed array as a plain argument. Chunks the rows because a single
 * request holding hundreds of rows both risks the plugin's 200-row cap and a
 * platform function timeout.
 */
export async function importLeadsAction(input: {
  rows: BulkLeadRow[];
  formId: number | null;
  formName: string;
  selfAssign: boolean;
  /** Admin chose "leave unassigned" — skips auto-assign for every row. */
  unassigned?: boolean;
}): Promise<{ error?: string; result?: BulkImportResult }> {
  const me = await requireUser();

  if (!input.rows.length) return { error: "No rows to import." };
  if (input.rows.length > 5000) {
    return { error: "That file has more than 5,000 rows — split it and import in parts." };
  }

  const rows = input.unassigned && !input.selfAssign
    ? input.rows.map((r) => ({ ...r, unassigned: true }))
    : input.rows;

  const CHUNK = 50;
  const total: BulkImportResult = { created: 0, skipped: [], campaign_id: null, campaign_name: null };

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    try {
      const res = await bulkCreateLeads({
        rows: chunk,
        // Every chunk after the first reuses the campaign the first one
        // created, so a 500-row file lands in one campaign, not ten.
        formId: total.campaign_id ?? input.formId,
        formName: total.campaign_id ? "" : input.formName,
        selfAssignTo: input.selfAssign ? me.id : null,
        actor: me,
        context: "import",
      });
      total.created += res.created;
      total.skipped.push(
        ...res.skipped.map((s) => ({ ...s, row: s.row + i }))
      );
      if (!total.campaign_id) {
        total.campaign_id = res.campaign_id;
        total.campaign_name = res.campaign_name;
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not reach the server.";
      return { error: `Stopped after ${total.created} lead(s): ${msg}` };
    }
  }

  revalidatePath("/leads");
  revalidatePath("/");
  if (total.campaign_id) revalidatePath(`/campaigns/${total.campaign_id}`);

  return { result: total };
}

/**
 * Fired alongside the WhatsApp button's own native navigation, not instead
 * of it — the <a href="wa.me/..."> opens the chat itself with zero JS
 * dependency; this just leaves a trace in the lead's timeline. A failure
 * here is deliberately silent to the user: a missing log entry shouldn't
 * block someone from actually messaging the lead.
 */
export async function logWhatsAppOpenAction(leadId: number) {
  const me = await requireUser();
  if (!hasPermission(me, "send_whatsapp")) return;

  const scope = me.role === "admin" ? null : me.id;
  try {
    await logWhatsAppOpen(leadId, me, scope);
    revalidatePath(`/leads/${leadId}`);
  } catch {
    // best-effort — see comment above
  }
}

export type LeadEmailState = FormState;

export async function sendLeadEmailAction(_prev: LeadEmailState, form: FormData): Promise<LeadEmailState> {
  const me = await requireUser();
  if (!hasPermission(me, "send_email")) {
    return { error: "You do not have permission to send email." };
  }

  const leadId = Number(form.get("lead_id"));
  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body_html") ?? "").trim();
  if (!subject) return { error: "Enter a subject line." };
  if (!body) return { error: "Write something in the body." };

  const blocks: EmailBlocks = {
    header_text: String(form.get("header_text") ?? ""),
    header_bg: String(form.get("header_bg") ?? "#07003A"),
    header_color: String(form.get("header_color") ?? "#FFFFFF"),
    body_html: body,
    body_bg: String(form.get("body_bg") ?? "#FFFFFF"),
    body_color: String(form.get("body_color") ?? "#2C2C33"),
    accent: String(form.get("accent") ?? "#F86E06"),
    cta_label: "",
    cta_url: "",
    footer_text: String(form.get("footer_text") ?? ""),
    footer_bg: String(form.get("footer_bg") ?? "#F6F6F9"),
    footer_color: String(form.get("footer_color") ?? "#7A7A7A"),
  };

  const scope = me.role === "admin" ? null : me.id;

  try {
    await sendLeadEmail({ leadId, subject, blocks, actor: me, ownerId: scope });
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    throw e;
  }

  revalidatePath(`/leads/${leadId}`);
  return { ok: "Email sent." };
}

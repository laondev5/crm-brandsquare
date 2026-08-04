"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addNote, getLeadFull, updateLead, type LeadUpdate } from "@/lib/queries";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

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

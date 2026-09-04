"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPipeline, listLeads, updateLead } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { LeadStatus } from "@/lib/types";
import { isAdminRole } from "@/lib/types";

/**
 * Drag-and-drop stage change from the pipeline board.
 *
 * Deliberately one API call, not two: updateLead sends the sub-admin's id as
 * the scope and the plugin puts it in the WHERE clause, so a forged lead id
 * simply matches no row. Re-reading the lead first to "check" ownership would
 * double the latency of every drag for a guarantee the server already makes.
 */
export async function moveLeadAction(
  id: number,
  status: LeadStatus
): Promise<{ ok: true } | { error: string }> {
  const me = await requireUser();

  const pipeline = await getPipeline();
  if (!pipeline.stages.some((s) => s.key === status)) {
    return { error: "Unknown stage." };
  }

  const scope = isAdminRole(me.role) ? null : me.id;

  try {
    await updateLead(id, me, { status }, scope);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
      return { error: e.message };
    }
    return { error: "Could not save that move. Please try again." };
  }

  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export interface QuickHit {
  id: number;
  name: string;
  email: string;
  status: LeadStatus;
}

/**
 * Lead lookup for the command palette. Returns the few fields the palette
 * actually renders rather than whole lead rows, because this fires on almost
 * every keystroke.
 */
export async function quickSearchAction(term: string): Promise<QuickHit[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const me = await requireUser();
  const scope = isAdminRole(me.role) ? null : me.id;

  try {
    const { rows } = await listLeads({ search: q, ownerId: scope, perPage: 6, page: 1 });
    return rows.map((l) => ({
      id: l.id,
      name: l.name || "(no name)",
      email: l.email,
      status: l.status,
    }));
  } catch {
    // A failed lookup should leave the palette usable for navigation, not
    // throw an error boundary over the whole dashboard.
    return [];
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { bulkDeleteLeads, bulkUpdateLeads, getPipeline } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { hasPermission, isAdminRole } from "@/lib/types";

type Result = { ok: true; updated: number } | { error: string };

/**
 * Changing stage or owner on many leads at once.
 *
 * The scope rule is the same one every other lead call uses: a sub-admin's id
 * goes to the server as `owner` and lands in the WHERE clause, so a selection
 * that reaches past their own leads updates only the rows that are really
 * theirs. It is not a check the browser could be talked out of.
 *
 * Reassignment stays admin-only, matching the single-lead Manage panel — a
 * sub-admin cannot hand work to someone else one lead at a time, so being
 * able to do it fifty at a time would be a strange hole.
 */
export async function bulkUpdateAction(input: {
  ids: number[];
  status?: string;
  assignedTo?: number | null;
}): Promise<Result> {
  const me = await requireUser();
  const admin = isAdminRole(me.role);

  const ids = input.ids.filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return { error: "Nothing was selected." };

  const patch: { status?: string; assignedTo?: number | null } = {};

  if (input.status) {
    const pipeline = await getPipeline();
    if (!pipeline.stages.some((s) => s.key === input.status)) {
      return { error: "That stage no longer exists." };
    }
    patch.status = input.status;
  }

  if (input.assignedTo !== undefined) {
    if (!admin) return { error: "Only an admin can reassign leads." };
    patch.assignedTo = input.assignedTo;
  }

  if (patch.status === undefined && patch.assignedTo === undefined) {
    return { error: "Choose a stage or an owner to apply." };
  }

  try {
    const res = await bulkUpdateLeads({
      ids,
      actor: me,
      status: patch.status,
      assignedTo: patch.assignedTo,
      ownerId: admin ? null : me.id,
    });
    revalidatePath("/leads");
    revalidatePath("/pipeline");
    revalidatePath("/my-work");
    return { ok: true, updated: res.updated ?? ids.length };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not apply that change." };
  }
}

/**
 * Deleting many leads at once. Permanent, like the single delete, and scoped
 * the same way: a sub-admin's id goes into the WHERE clause, so only their
 * own leads can go.
 */
export async function bulkDeleteAction(ids: number[]): Promise<{ ok: true; deleted: number } | { error: string }> {
  const me = await requireUser();
  if (!hasPermission(me, "delete_leads")) return { error: "You do not have permission to delete leads." };

  const clean = ids.filter((n) => Number.isInteger(n) && n > 0);
  if (!clean.length) return { error: "Nothing was selected." };

  try {
    const res = await bulkDeleteLeads({ ids: clean, actor: me, ownerId: isAdminRole(me.role) ? null : me.id });
    revalidatePath("/leads");
    revalidatePath("/pipeline");
    revalidatePath("/");
    return { ok: true, deleted: res.deleted ?? 0 };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not delete those leads." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createView, deleteView } from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Result = { ok: true } | { error: string };
type ViewScope = "leads" | "deals" | "tasks";

/**
 * Saved views are shared, not personal.
 *
 * A view is a named filter over records everyone can already see, and the
 * useful ones ("Overdue, unassigned", "Won this month") are worth having once
 * rather than being rebuilt by each person. Scoping stays where it always is:
 * the list itself is still filtered to a sub-admin's own rows by the server,
 * so the same view shows each person their own records.
 */
export async function saveViewAction(
  name: string,
  query: string,
  scope: ViewScope = "leads",
  path = "/leads"
): Promise<Result> {
  const me = await requireUser();
  const clean = name.trim();
  if (!clean) return { error: "Give the view a name." };

  try {
    await createView(me, clean, query, scope);
    revalidatePath(path);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not save that view." };
  }
}

export async function deleteViewAction(id: number, path = "/leads"): Promise<Result> {
  await requireUser();
  try {
    await deleteView(id);
    revalidatePath(path);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not remove that view." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createView, deleteView } from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Result = { ok: true } | { error: string };

/**
 * Saved views are shared, not personal.
 *
 * A view is a named filter over leads everyone can already see, and the
 * useful ones ("Overdue, unassigned", "Won this month") are worth having once
 * rather than being rebuilt by each person. Scoping stays where it always is:
 * the list itself is still filtered to a sub-admin's own leads by the server,
 * so the same view shows each person their own rows.
 */
export async function saveViewAction(name: string, query: string): Promise<Result> {
  const me = await requireUser();
  const clean = name.trim();
  if (!clean) return { error: "Give the view a name." };

  try {
    await createView(me, clean, query);
    revalidatePath("/leads");
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not save that view." };
  }
}

export async function deleteViewAction(id: number): Promise<Result> {
  await requireUser();
  try {
    await deleteView(id);
    revalidatePath("/leads");
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not remove that view." };
  }
}

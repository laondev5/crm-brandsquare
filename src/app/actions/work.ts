"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/auth";
import {
  deleteProject,
  deleteWorkTask,
  saveProject,
  saveWorkTask,
  signIn,
  signOut,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Result<T = unknown> = ({ ok: true } & T) | { error: string };

function fail(e: unknown, fallback: string): { error: string } {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function signInAction(): Promise<Result> {
  const me = await requireUser();
  try {
    await signIn(me);
  } catch (e) {
    return fail(e, "Could not sign you in.");
  }
  revalidatePath("/work");
  return { ok: true };
}

/**
 * Signing out writes the day down.
 *
 * The summary is checked here for a readable message and again on the server,
 * which is the one that counts — a sign-out with nothing attached is exactly
 * what this replaces.
 */
export async function signOutAction(form: FormData): Promise<Result> {
  const me = await requireUser();

  const summary = String(form.get("summary") ?? "").trim();
  if (!summary) return { error: "Write a line about what you got done before signing out." };

  try {
    await signOut(me, {
      summary,
      blockers: String(form.get("blockers") ?? "").trim(),
      plan_tomorrow: String(form.get("plan_tomorrow") ?? "").trim(),
      mood: String(form.get("mood") ?? ""),
    });
  } catch (e) {
    return fail(e, "Could not save your day.");
  }

  revalidatePath("/work");
  revalidatePath("/work/team");
  return { ok: true };
}

/* ---------------- projects ---------------- */

export async function saveProjectAction(
  id: number | null,
  body: Record<string, unknown>
): Promise<Result<{ id?: number }>> {
  // Projects are a manager's structure; anyone can work inside them.
  const me = await requireAdmin();
  try {
    const res = await saveProject(me, id, body);
    revalidatePath("/projects");
    return { ok: true, id: res.id };
  } catch (e) {
    return fail(e, "Could not save that project.");
  }
}

export async function deleteProjectAction(id: number): Promise<Result> {
  const me = await requireAdmin();
  try {
    await deleteProject(me, id);
  } catch (e) {
    return fail(e, "Could not remove that project.");
  }
  revalidatePath("/projects");
  return { ok: true };
}

/* ---------------- the board ---------------- */

export async function saveTaskAction(
  id: number | null,
  body: Record<string, unknown>
): Promise<Result> {
  const me = await requireUser();
  try {
    await saveWorkTask(me, id, body);
  } catch (e) {
    return fail(e, "Could not save that task.");
  }
  // The same card shows on the board, on My day and in the manager overview.
  revalidatePath("/projects");
  revalidatePath("/work");
  revalidatePath("/work/team");
  return { ok: true };
}

export async function deleteTaskAction(id: number): Promise<Result> {
  const me = await requireUser();
  try {
    await deleteWorkTask(me, id);
  } catch (e) {
    return fail(e, "Could not remove that task.");
  }
  revalidatePath("/projects");
  revalidatePath("/work");
  return { ok: true };
}

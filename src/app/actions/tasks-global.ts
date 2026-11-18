"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createTask, deleteTask, patchTask } from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

function fail(e: unknown, fallback: string): Fail {
  return { error: e instanceof ApiError ? e.message : fallback };
}

/** Every task change touches the shared list and the screens that read the
 *  lead's next action, so they are refreshed together. */
function touched(leadId?: number) {
  revalidatePath("/tasks");
  revalidatePath("/my-work");
  revalidatePath("/agenda");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function quickAddTaskAction(
  _prev: { ok?: true; error?: string } | null,
  form: FormData
): Promise<{ ok?: true; error?: string }> {
  const me = await requireUser();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Give the task a name." };

  const assignee = Number(form.get("assigned_to"));
  const lead = Number(form.get("lead_id"));
  const org = Number(form.get("org_id"));
  const deal = Number(form.get("deal_id"));
  const priority = String(form.get("priority") ?? "normal");

  try {
    await createTask(me, {
      title,
      due_at: String(form.get("due_at") ?? "").trim(),
      detail: String(form.get("detail") ?? "").trim(),
      priority,
      assigned_to: assignee > 0 ? assignee : me.id,
      lead_id: lead > 0 ? lead : null,
      org_id: org > 0 ? org : null,
      deal_id: deal > 0 ? deal : null,
    });
    touched(lead > 0 ? lead : undefined);
    if (org > 0) revalidatePath(`/organizations/${org}`);
    if (deal > 0) revalidatePath(`/deals/${deal}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not add that task.");
  }
}

export async function completeTaskAction(id: number, done: boolean): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  try {
    const res = await patchTask(me, id, { done });
    touched(res.task?.lead_id || undefined);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not update that task.");
  }
}

export async function assignTaskAction(id: number, assignedTo: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  try {
    const res = await patchTask(me, id, { assigned_to: assignedTo });
    touched(res.task?.lead_id || undefined);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not hand that task over.");
  }
}

export async function updateTaskFieldsAction(
  id: number,
  patch: { title?: string; due_at?: string; detail?: string; priority?: string }
): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  try {
    const res = await patchTask(me, id, patch);
    touched(res.task?.lead_id || undefined);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not save that task.");
  }
}

export async function removeTaskAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  try {
    await deleteTask(id, me);
    touched();
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not remove that task.");
  }
}

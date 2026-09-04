"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addTask, deleteTask, updateTask } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { Task } from "@/lib/types";

type Result = { tasks: Task[] } | { error: string };

/**
 * Every task change revalidates the agenda and My work as well as the lead,
 * because the plugin keeps the lead's next-action date in step with its
 * earliest open task — so ticking one off here changes what those screens
 * show.
 */
function touched(leadId: number) {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/agenda");
  revalidatePath("/my-work");
  revalidatePath("/leads");
}

export async function addTaskAction(leadId: number, title: string, dueAt: string): Promise<Result> {
  const me = await requireUser();
  if (!title.trim()) return { error: "Give the task a name." };

  try {
    const res = await addTask(leadId, title.trim(), dueAt, me);
    touched(leadId);
    return { tasks: res.tasks };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not add that task." };
  }
}

export async function setTaskDoneAction(
  leadId: number,
  taskId: number,
  done: boolean
): Promise<Result> {
  const me = await requireUser();
  try {
    const res = await updateTask(taskId, { done }, me);
    touched(leadId);
    return { tasks: res.tasks };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not update that task." };
  }
}

export async function deleteTaskAction(leadId: number, taskId: number): Promise<Result> {
  const me = await requireUser();
  try {
    const res = await deleteTask(taskId, me);
    touched(leadId);
    return { tasks: res.tasks };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not remove that task." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveFormStages, saveStages } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { Stage } from "@/lib/types";

type Result = { ok: true; moved?: number } | { error: string };

/**
 * A pipeline has to be able to end. Checked here so the person gets a straight
 * answer in the form rather than a 400 from the API, but the plugin enforces
 * the same rule — this is the courtesy, not the guarantee.
 */
function firstProblem(stages: Stage[]): string | null {
  if (stages.length === 0) return "A pipeline needs at least one stage.";
  if (!stages.some((s) => s.type === "won")) {
    return "One stage has to mark a deal as won, or nothing can ever be closed.";
  }
  if (!stages.some((s) => s.type === "lost")) {
    return "One stage has to mark a deal as lost.";
  }
  if (stages.some((s) => !s.label.trim())) return "Every stage needs a name.";
  return null;
}

export async function saveSharedStagesAction(stages: Stage[]): Promise<Result> {
  const me = await requireAdmin();
  const problem = firstProblem(stages);
  if (problem) return { error: problem };

  try {
    await saveStages(me, stages);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save the pipeline." };
  }

  // The stage list drives the board columns, the leads tabs and every stage
  // dropdown, so nothing that shows one may keep a cached copy.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCampaignStagesAction(
  formId: number,
  stages: Stage[] | null
): Promise<Result> {
  const me = await requireAdmin();

  if (stages) {
    const problem = firstProblem(stages);
    if (problem) return { error: problem };
  }

  try {
    const res = await saveFormStages(me, formId, stages);
    revalidatePath("/", "layout");
    return { ok: true, moved: res.moved };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save the pipeline." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createSite, deleteSite, updateSite } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { FormState } from "./auth";

/**
 * Managing connected websites is a super admin's job, and it is checked here
 * and again in the plugin. Hiding the page in the nav is convenience; these
 * are the checks.
 */

export type AddSiteState = FormState & {
  /** Returned once and never again — the server stores only a hash of it. */
  created?: { name: string; siteKey: string; hubUrl: string };
};

export async function addSiteAction(_prev: AddSiteState, form: FormData): Promise<AddSiteState> {
  const me = await requireSuperAdmin();

  const name = String(form.get("name") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  if (!name) return { error: "Give the website a name." };

  try {
    const res = await createSite(me, name, url);
    revalidatePath("/sites");
    return {
      ok: `${res.name} added.`,
      created: { name: res.name, siteKey: res.site_key, hubUrl: res.hub_url },
    };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not add that website. Please try again." };
  }
}

export async function setSiteStatusAction(
  id: number,
  status: "active" | "revoked"
): Promise<{ ok: true } | { error: string }> {
  const me = await requireSuperAdmin();
  try {
    await updateSite(me, id, { status });
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not change that website." };
  }
  revalidatePath("/sites");
  return { ok: true };
}

export async function removeSiteAction(id: number): Promise<{ ok: true } | { error: string }> {
  const me = await requireSuperAdmin();
  try {
    await deleteSite(me, id);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not remove that website." };
  }
  revalidatePath("/sites");
  revalidatePath("/leads");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdminRole, type Deal, type DealInput, type DealNote, type Role } from "@/lib/types";
import {
  addDealNote,
  createDeal,
  deleteDeal,
  deleteDealNote,
  updateDeal,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

function mayWrite(role: Role, permissions: string[]) {
  return isAdminRole(role) || (role === "subadmin" && permissions.includes("add_leads"));
}

function fail(e: unknown, fallback: string): Fail {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function readForm(form: FormData): DealInput {
  const org = Number(form.get("org_id"));
  const lead = Number(form.get("lead_id"));
  const owner = Number(form.get("owner_id"));
  const amount = Number(String(form.get("amount") ?? "").replace(/,/g, ""));

  return {
    title: String(form.get("title") ?? "").trim(),
    org_id: org > 0 ? org : null,
    lead_id: lead > 0 ? lead : null,
    stage: String(form.get("stage") ?? "").trim(),
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    currency: String(form.get("currency") ?? "NGN").trim().toUpperCase() || "NGN",
    close_date: String(form.get("close_date") ?? "").trim(),
    source: String(form.get("source") ?? "").trim(),
    notes: String(form.get("notes") ?? "").trim(),
    owner_id: owner > 0 ? owner : null,
  };
}

export type DealFormState = { ok?: true; deal?: Deal; error?: string } | null;

export async function saveDealAction(_prev: DealFormState, form: FormData): Promise<DealFormState> {
  const me = await requireUser();
  if (!mayWrite(me.role, me.permissions)) {
    return { error: "You do not have permission to save deals." };
  }

  const id = Number(form.get("id"));
  const input = readForm(form);
  if (!input.title) return { error: "Give the deal a name." };

  try {
    const res = id > 0 ? await updateDeal(me, id, input) : await createDeal(me, input);
    revalidatePath("/deals");
    revalidatePath(`/deals/${res.id}`);
    if (input.org_id) revalidatePath(`/organizations/${input.org_id}`);
    if (input.lead_id) revalidatePath(`/leads/${input.lead_id}`);
    return { ok: true, deal: res.deal };
  } catch (e) {
    return fail(e, "Could not save the deal.");
  }
}

/** Moving a card between stages. Its own action because the board saves on
 *  drop and has no form to submit. */
export async function moveDealAction(id: number, stage: string): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  try {
    const res = await updateDeal(me, id, { stage });
    revalidatePath("/deals");
    revalidatePath(`/deals/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not move that deal.");
  }
}

export async function addDealNoteAction(id: number, body: string): Promise<{ note: DealNote } | Fail> {
  const me = await requireUser();
  if (!body.trim()) return { error: "A note cannot be empty." };
  try {
    const res = await addDealNote(me, id, body);
    revalidatePath(`/deals/${id}`);
    return { note: res.note };
  } catch (e) {
    return fail(e, "Could not add the note.");
  }
}

export async function deleteDealNoteAction(id: number, noteId: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  try {
    await deleteDealNote(me, id, noteId);
    revalidatePath(`/deals/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not remove the note.");
  }
}

export async function deleteDealAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can delete a deal." };
  try {
    await deleteDeal(me, id);
    revalidatePath("/deals");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete the deal.");
  }
}

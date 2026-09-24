"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  addMachineRequestNote,
  deleteMachineRequest,
  saveMachineRequest,
  saveMachineSources,
  type MachineRequestInput,
} from "@/lib/queries";
import type { MachineSource } from "@/lib/types";
import { ApiError } from "@/lib/api";

type Result = { ok: true; id?: number } | { error: string };

function fail(e: unknown, fallback: string): { error: string } {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function refresh(id?: number) {
  revalidatePath("/requests");
  if (id) revalidatePath(`/requests/${id}`);
}

/**
 * Creates a machine request from whatever is known.
 *
 * The phone number is the only thing asked for: an enquiry usually arrives as
 * a WhatsApp message from a number, and waiting for a name before recording
 * it is how requests end up living in someone's chat history instead.
 */
export async function createRequestAction(_prev: Result | null, form: FormData): Promise<Result> {
  const me = await requireUser();
  const phone = String(form.get("phone") ?? "").trim();
  if (!phone) return { error: "A phone number is the one thing a request needs." };

  const body: MachineRequestInput = {
    phone,
    name: String(form.get("name") ?? "").trim(),
    company: String(form.get("company") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    country: String(form.get("country") ?? "").trim(),
    source: String(form.get("source") ?? "whatsapp"),
    machine: String(form.get("machine") ?? "").trim(),
    capacity: String(form.get("capacity") ?? "").trim(),
    requirements: String(form.get("requirements") ?? "").trim(),
    notes: String(form.get("notes") ?? "").trim(),
    next_action: String(form.get("next_action") ?? "").trim(),
  };
  const lead = Number(form.get("lead_id")) || null;
  if (lead) body.lead_id = lead;
  const proc = Number(form.get("assigned_procurement")) || null;
  const sales = Number(form.get("assigned_sales")) || null;
  if (proc) body.assigned_procurement = proc;
  if (sales) body.assigned_sales = sales;

  try {
    const res = await saveMachineRequest(me, null, body);
    refresh(res.request.id);
    if (lead) revalidatePath(`/leads/${lead}`);
    return { ok: true, id: res.request.id };
  } catch (e) {
    return fail(e, "Could not save the request.");
  }
}

/** Any single field, from the detail page or straight off the list. */
export async function updateRequestAction(id: number, patch: MachineRequestInput): Promise<Result> {
  const me = await requireUser();
  try {
    await saveMachineRequest(me, id, patch);
  } catch (e) {
    return fail(e, "Could not save the change.");
  }
  refresh(id);
  return { ok: true };
}

export async function saveRequestFormAction(id: number, _prev: Result | null, form: FormData): Promise<Result> {
  const me = await requireUser();
  const num = (k: string) => {
    const v = Number(form.get(k));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const body: MachineRequestInput = {
    phone: String(form.get("phone") ?? "").trim(),
    name: String(form.get("name") ?? "").trim(),
    company: String(form.get("company") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    country: String(form.get("country") ?? "").trim(),
    source: String(form.get("source") ?? "other"),
    machine: String(form.get("machine") ?? "").trim(),
    capacity: String(form.get("capacity") ?? "").trim(),
    requirements: String(form.get("requirements") ?? "").trim(),
    notes: String(form.get("notes") ?? "").trim(),
    next_action: String(form.get("next_action") ?? "").trim(),
    breakdown_link: String(form.get("breakdown_link") ?? "").trim(),
    assigned_procurement: num("assigned_procurement"),
    assigned_sales: num("assigned_sales"),
  };
  if (!body.phone) return { error: "A phone number is the one thing a request needs." };

  try {
    await saveMachineRequest(me, id, body);
  } catch (e) {
    return fail(e, "Could not save the request.");
  }
  refresh(id);
  return { ok: true, id };
}

/** A line of what happened. It also becomes the request's "last update". */
export async function addRequestNoteAction(id: number, note: string): Promise<Result> {
  const me = await requireUser();
  if (!note.trim()) return { error: "Write what happened." };
  try {
    await addMachineRequestNote(me, id, note.trim());
  } catch (e) {
    return fail(e, "Could not save that update.");
  }
  refresh(id);
  return { ok: true };
}

/** The source list, saved whole and in order. Admins only; the plugin re-checks. */
export async function saveMachineSourcesAction(sources: MachineSource[]): Promise<Result> {
  const me = await requireAdmin();
  if (!sources.some((s) => !s.archived)) {
    return { error: "Keep at least one source that is not retired." };
  }
  try {
    await saveMachineSources(me, sources);
  } catch (e) {
    return fail(e, "Could not save the list.");
  }
  revalidatePath("/settings/request-sources");
  revalidatePath("/requests");
  return { ok: true };
}

export async function deleteRequestAction(id: number): Promise<Result> {
  const me = await requireUser();
  try {
    await deleteMachineRequest(me, id);
  } catch (e) {
    return fail(e, "Could not delete the request.");
  }
  refresh();
  return { ok: true };
}

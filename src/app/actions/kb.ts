"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createKb, deleteKb, updateKb } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { KbKind } from "@/lib/types";

type Result = { ok: true } | { error: string };

const pages = (kind: KbKind) =>
  kind === "faq" ? ["/templates/faq", "/settings/faq"] : ["/templates/responses", "/settings/responses"];

/** Writing to the knowledge base is an admin's job; everyone reads it. */
export async function saveKbAction(input: {
  id?: number;
  kind: KbKind;
  section: string;
  title: string;
  body: string;
}): Promise<Result> {
  const me = await requireAdmin();
  const section = input.section.trim();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!section) return { error: "Choose or name a section." };
  if (!title) return { error: input.kind === "faq" ? "Write the question." : "Give the template a title." };
  if (!body) return { error: input.kind === "faq" ? "Write the answer." : "Write the message." };

  try {
    if (input.id) await updateKb(me, input.id, { section, title, body });
    else await createKb(me, { kind: input.kind, section, title, body });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save that." };
  }
  pages(input.kind).forEach((p) => revalidatePath(p));
  return { ok: true };
}

export async function deleteKbAction(kind: KbKind, id: number): Promise<Result> {
  const me = await requireAdmin();
  try {
    await deleteKb(me, id);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not delete that." };
  }
  pages(kind).forEach((p) => revalidatePath(p));
  return { ok: true };
}

/** Moves an entry up or down by swapping its order with its neighbour's. */
export async function moveKbAction(
  kind: KbKind,
  a: { id: number; sort_order: number },
  b: { id: number; sort_order: number }
): Promise<Result> {
  const me = await requireAdmin();
  try {
    // Equal orders would swap to the same values, so separate them first.
    const first = a.sort_order === b.sort_order ? b.sort_order + 1 : b.sort_order;
    await updateKb(me, a.id, { sort_order: first });
    await updateKb(me, b.id, { sort_order: a.sort_order });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not reorder." };
  }
  pages(kind).forEach((p) => revalidatePath(p));
  return { ok: true };
}

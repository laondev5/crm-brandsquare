"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdminRole, readMoney, type CatalogueItem } from "@/lib/types";
import {
  createCatalogueItem,
  deleteCatalogueItem,
  listCatalogue,
  updateCatalogueItem,
  type CatalogueInput,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

function fail(e: unknown, fallback: string): Fail {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function loadDocumentCatalogueAction(): Promise<{ items: CatalogueItem[] } | Fail> {
  await requireUser();
  try {
    const { items } = await listCatalogue({ active: true });
    return { items: items.filter((item) => item.active) };
  } catch {
    return { error: "Could not load the catalogue. Try again, or add a line manually." };
  }
}

function readForm(form: FormData): CatalogueInput {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  return {
    name: text("name"),
    model: text("model"),
    category: text("category"),
    description: text("description"),
    suitable_for: text("suitable_for"),
    specs: text("specs"),
    price: readMoney(text("price")),
    currency: text("currency") || "USD",
    image_url: text("image_url"),
    active: form.get("active") === "1",
    position: Number(form.get("position")) || 0,
  };
}

export type CatalogueFormState = { ok?: true; item?: CatalogueItem; error?: string } | null;

export async function saveCatalogueAction(
  _prev: CatalogueFormState,
  form: FormData
): Promise<CatalogueFormState> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can change the catalogue." };

  const input = readForm(form);
  if (!input.name) return { error: "Give the machine a name." };

  const id = Number(form.get("id"));
  try {
    const res = id > 0 ? await updateCatalogueItem(me, id, input) : await createCatalogueItem(me, input);
    revalidatePath("/catalogue");
    return { ok: true, item: res.item };
  } catch (e) {
    return fail(e, "Could not save the catalogue item.");
  }
}

export async function deleteCatalogueAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can change the catalogue." };

  try {
    await deleteCatalogueItem(me, id);
    revalidatePath("/catalogue");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not remove the catalogue item.");
  }
}

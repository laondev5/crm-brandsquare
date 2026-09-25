"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdminRole, readMoney, type Quote, type QuoteStatus, type Role } from "@/lib/types";
import { createQuote, deleteQuote, updateQuote, type QuoteInput } from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

/** Quoting is selling. Everyone who works a lead may write one; an author or
 *  the MD, who are here to read, may not. The plugin checks the same thing. */
function mayQuote(role: Role) {
  return isAdminRole(role) || role === "subadmin";
}

function fail(e: unknown, fallback: string): Fail {
  return { error: e instanceof ApiError ? e.message : fallback };
}

/**
 * Reads a quote out of the form the rep filled in.
 *
 * Every figure here was typed by hand, so nothing is inferred and nothing is
 * looked up: quantities and prices come across as written, and the arithmetic
 * is the plugin's to do.
 */
function readForm(form: FormData): QuoteInput {
  const descriptions = form.getAll("item_description").map(String);
  const quantities = form.getAll("item_qty").map(String);
  const prices = form.getAll("item_price").map(String);

  const items = descriptions
    .map((description, i) => ({
      description: description.trim(),
      qty: readMoney(quantities[i] ?? "1") || 1,
      unit_price: readMoney(prices[i] ?? "0"),
    }))
    // A line nobody filled in is not a line. The form offers spares; a
    // quotation should carry only what was written on it.
    .filter((item) => item.description !== "" || item.unit_price > 0);

  const lead = Number(form.get("lead_id"));
  const conversation = Number(form.get("conversation_id"));

  return {
    lead_id: lead > 0 ? lead : null,
    conversation_id: conversation > 0 ? conversation : null,
    customer_name: String(form.get("customer_name") ?? "").trim(),
    customer_company: String(form.get("customer_company") ?? "").trim(),
    customer_email: String(form.get("customer_email") ?? "").trim(),
    customer_phone: String(form.get("customer_phone") ?? "").trim(),
    currency: String(form.get("currency") ?? "NGN").trim() || "NGN",
    issued_on: String(form.get("issued_on") ?? "").trim() || null,
    valid_until: String(form.get("valid_until") ?? "").trim() || null,
    tax_percent: readMoney(String(form.get("tax_percent") ?? "0")),
    items,
  };
}

export type QuoteFormState = { ok?: true; quote?: Quote; error?: string } | null;

export async function saveQuoteAction(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  const me = await requireUser();
  if (!mayQuote(me.role)) return { error: "You do not have permission to write quotations." };

  const input = readForm(form);
  if (!input.items?.length) {
    return { error: "A quotation needs at least one line. Describe what you are quoting for and put a price on it." };
  }
  if (!input.customer_name) {
    return { error: "Put the customer's name on it." };
  }

  const id = Number(form.get("id"));
  try {
    const res = id > 0 ? await updateQuote(me, id, input) : await createQuote(me, input);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${res.quote.id}`);
    if (input.lead_id) revalidatePath(`/leads/${input.lead_id}`);
    return { ok: true, quote: res.quote };
  } catch (e) {
    return fail(e, "Could not save the quotation.");
  }
}

/** Moves a quote along: sent, accepted, declined, or back to draft. */
export async function setQuoteStatusAction(
  id: number,
  status: QuoteStatus
): Promise<{ quote: Quote } | Fail> {
  const me = await requireUser();
  if (!mayQuote(me.role)) return { error: "You do not have permission to change quotations." };

  try {
    const res = await updateQuote(me, id, { status });
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    if (res.quote.lead_id) revalidatePath(`/leads/${res.quote.lead_id}`);
    return { quote: res.quote };
  } catch (e) {
    return fail(e, "Could not update the quotation.");
  }
}

export async function deleteQuoteAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can delete a quotation." };

  try {
    await deleteQuote(me, id);
    revalidatePath("/quotes");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete the quotation.");
  }
}

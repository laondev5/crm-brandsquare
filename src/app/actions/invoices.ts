"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdminRole, INVOICE_STATUSES, readMoney, type Invoice, type InvoiceStatus, type Role } from "@/lib/types";
import {
  createInvoice,
  deleteInvoice,
  invoiceFromQuote,
  updateInvoice,
  type InvoiceInput,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

/** Writing invoices follows quotations: the reps who sell write them, the
 *  people who only read do not. The plugin checks the same list. */
function mayWrite(role: Role) {
  return isAdminRole(role) || role === "subadmin";
}

function fail(e: unknown, fallback: string): Fail {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function readForm(form: FormData): InvoiceInput {
  const descriptions = form.getAll("item_description").map(String);
  const quantities = form.getAll("item_qty").map(String);
  const prices = form.getAll("item_price").map(String);
  const details = form.getAll("item_machine_description").map(String);
  const suitable = form.getAll("item_suitable_for").map(String);

  const items = descriptions
    .map((description, i) => ({
      description: description.trim(),
      qty: readMoney(quantities[i] ?? "1") || 1,
      unit_price: readMoney(prices[i] ?? "0"),
      machine_description: (details[i] ?? "").trim(),
      suitable_for: (suitable[i] ?? "").trim(),
    }))
    .filter((item) => item.description !== "" || item.unit_price > 0);

  const quote = Number(form.get("quote_id"));
  const org = Number(form.get("org_id"));
  const lead = Number(form.get("lead_id"));
  const status = String(form.get("status") ?? "");
  const text = (key: string) => String(form.get(key) ?? "").trim();

  return {
    invoice_no: text("invoice_no"),
    quote_id: quote > 0 ? quote : null,
    org_id: org > 0 ? org : null,
    lead_id: lead > 0 ? lead : null,
    customer_name: text("customer_name"),
    customer_company: text("customer_company"),
    customer_location: text("customer_location"),
    customer_email: text("customer_email"),
    customer_phone: text("customer_phone"),
    currency: text("currency") || "NGN",
    issued_on: text("issued_on") || null,
    valid_until: text("valid_until") || null,
    tax_percent: readMoney(text("tax_percent")),
    bank_name: text("bank_name"),
    bank_account_name: text("bank_account_name"),
    bank_account_number: text("bank_account_number"),
    bank_swift: text("bank_swift"),
    bank_currency: text("bank_currency"),
    payment_terms: text("payment_terms"),
    notes: text("notes"),
    next_step: text("next_step"),
    status: INVOICE_STATUSES.some((s) => s.key === status) ? (status as InvoiceStatus) : "draft",
    items,
  };
}

export type InvoiceFormState = { ok?: true; invoice?: Invoice; error?: string } | null;

export async function saveInvoiceAction(
  _prev: InvoiceFormState,
  form: FormData
): Promise<InvoiceFormState> {
  const me = await requireUser();
  if (!mayWrite(me.role)) return { error: "You do not have permission to write invoices." };

  const input = readForm(form);
  if (!input.items?.length) {
    return { error: "An invoice needs at least one line. Describe what is being invoiced and put a price on it." };
  }
  if (!input.customer_name) return { error: "Put the customer's name on it." };

  const id = Number(form.get("id"));
  try {
    const res = id > 0 ? await updateInvoice(me, id, input) : await createInvoice(me, input);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${res.invoice.id}`);
    if (input.org_id) revalidatePath(`/organizations/${input.org_id}`);
    if (input.quote_id) revalidatePath(`/quotes/${input.quote_id}`);
    return { ok: true, invoice: res.invoice };
  } catch (e) {
    return fail(e, "Could not save the invoice.");
  }
}

/** Moves an invoice along. Paid and part-paid are normally set by receipts;
 *  this is for sent, accepted and cancelled, typed by a person. */
export async function setInvoiceStatusAction(
  id: number,
  status: InvoiceStatus
): Promise<{ invoice: Invoice } | Fail> {
  const me = await requireUser();
  if (!mayWrite(me.role)) return { error: "You do not have permission to change invoices." };

  try {
    const res = await updateInvoice(me, id, { status });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { invoice: res.invoice };
  } catch (e) {
    return fail(e, "Could not update the invoice.");
  }
}

/** Turns a quotation into a proforma invoice. Pressing it twice hands back the
 *  invoice that already exists rather than writing a second one. */
export async function invoiceFromQuoteAction(
  quoteId: number
): Promise<{ invoice: Invoice; existing: boolean } | Fail> {
  const me = await requireUser();
  if (!mayWrite(me.role)) return { error: "You do not have permission to write invoices." };

  try {
    const res = await invoiceFromQuote(me, quoteId);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${res.invoice.id}`);
    revalidatePath(`/quotes/${quoteId}`);
    return res;
  } catch (e) {
    return fail(e, "Could not raise an invoice from the quotation.");
  }
}

export async function deleteInvoiceAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can delete an invoice." };

  try {
    await deleteInvoice(me, id);
    revalidatePath("/invoices");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete the invoice.");
  }
}

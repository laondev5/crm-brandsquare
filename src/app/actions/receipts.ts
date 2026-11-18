"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdminRole, readMoney, type Receipt, type Role } from "@/lib/types";
import {
  createReceipt,
  deleteReceipt,
  receiptFromInvoice,
  updateReceipt,
  type ReceiptInput,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

function mayWrite(role: Role) {
  return isAdminRole(role) || role === "subadmin";
}

function fail(e: unknown, fallback: string): Fail {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function readForm(form: FormData): ReceiptInput {
  const descriptions = form.getAll("item_description").map(String);
  const quantities = form.getAll("item_qty").map(String);
  const amounts = form.getAll("item_amount").map(String);

  // Receipts describe what arrived, so a line carries a total rather than a
  // unit price — the amount handed over for that item, as written.
  const items = descriptions
    .map((description, i) => ({
      description: description.trim(),
      qty: readMoney(quantities[i] ?? "1") || 1,
      line_total: readMoney(amounts[i] ?? "0"),
    }))
    .filter((item) => item.description !== "" || item.line_total > 0);

  const invoice = Number(form.get("invoice_id"));
  const org = Number(form.get("org_id"));
  const lead = Number(form.get("lead_id"));
  const text = (key: string) => String(form.get(key) ?? "").trim();

  return {
    receipt_no: text("receipt_no"),
    invoice_id: invoice > 0 ? invoice : null,
    org_id: org > 0 ? org : null,
    lead_id: lead > 0 ? lead : null,
    customer_name: text("customer_name"),
    customer_company: text("customer_company"),
    customer_email: text("customer_email"),
    customer_phone: text("customer_phone"),
    currency: text("currency") || "NGN",
    receipt_date: text("receipt_date") || null,
    payment_date: text("payment_date") || null,
    amount_received: readMoney(text("amount_received")),
    share_percent: readMoney(text("share_percent")),
    order_total: readMoney(text("order_total")),
    payment_method: text("payment_method"),
    payment_reference: text("payment_reference"),
    summary: text("summary"),
    terms: text("terms"),
    notes: text("notes"),
    items,
  };
}

export type ReceiptFormState = { ok?: true; receipt?: Receipt; error?: string } | null;

export async function saveReceiptAction(
  _prev: ReceiptFormState,
  form: FormData
): Promise<ReceiptFormState> {
  const me = await requireUser();
  if (!mayWrite(me.role)) return { error: "You do not have permission to write receipts." };

  const input = readForm(form);
  if (!input.amount_received || input.amount_received <= 0) {
    return { error: "A receipt needs an amount received." };
  }
  if (!input.order_total || input.order_total <= 0) {
    return { error: "A receipt needs the order total it is a payment against." };
  }

  const id = Number(form.get("id"));
  try {
    const res = id > 0 ? await updateReceipt(me, id, input) : await createReceipt(me, input);
    revalidatePath("/receipts");
    revalidatePath(`/receipts/${res.receipt.id}`);
    if (input.invoice_id) revalidatePath(`/invoices/${input.invoice_id}`);
    if (input.org_id) revalidatePath(`/organizations/${input.org_id}`);
    return { ok: true, receipt: res.receipt };
  } catch (e) {
    return fail(e, "Could not save the receipt.");
  }
}

/** Records a payment against an invoice, filled in from the invoice itself.
 *  The plugin refuses when nothing is still owed, and says so in words. */
export async function receiptFromInvoiceAction(invoiceId: number): Promise<{ receipt: Receipt } | Fail> {
  const me = await requireUser();
  if (!mayWrite(me.role)) return { error: "You do not have permission to write receipts." };

  try {
    const res = await receiptFromInvoice(me, invoiceId);
    revalidatePath("/receipts");
    revalidatePath(`/receipts/${res.receipt.id}`);
    revalidatePath(`/invoices/${invoiceId}`);
    return res;
  } catch (e) {
    return fail(e, "Could not record a receipt against this invoice.");
  }
}

export async function deleteReceiptAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can delete a receipt." };

  try {
    await deleteReceipt(me, id);
    revalidatePath("/receipts");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete the receipt.");
  }
}

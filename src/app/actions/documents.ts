"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdminRole, readMoney, type DocSettings } from "@/lib/types";
import { saveDocSettings } from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

export type DocSettingsFormState = { ok?: true; settings?: DocSettings; error?: string } | null;

/**
 * The one place the letterhead, bank details, signatory and boilerplate are
 * changed. Documents already written keep their own copy, so saving here
 * changes what the next paper says rather than rewriting old ones.
 */
export async function saveDocSettingsAction(
  _prev: DocSettingsFormState,
  form: FormData
): Promise<DocSettingsFormState> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can change document settings." };

  const text = (key: string) => String(form.get(key) ?? "").trim();
  const input: Partial<DocSettings> = {
    company_name: text("company_name"),
    tagline: text("tagline"),
    website: text("website"),
    email: text("email"),
    signatory_name: text("signatory_name"),
    signatory_title: text("signatory_title"),
    bank_name: text("bank_name"),
    bank_account_name: text("bank_account_name"),
    bank_account_number: text("bank_account_number"),
    bank_swift: text("bank_swift"),
    bank_currency: text("bank_currency"),
    default_currency: text("default_currency"),
    default_valid_days: Math.max(1, Math.round(readMoney(text("default_valid_days")))),
    default_tax_percent: readMoney(text("default_tax_percent")),
    default_receipt_share: readMoney(text("default_receipt_share")),
    payment_terms: text("payment_terms"),
    invoice_notes: text("invoice_notes"),
    invoice_next_step: text("invoice_next_step"),
    quote_notes: text("quote_notes"),
    quote_next_step: text("quote_next_step"),
    receipt_terms: text("receipt_terms"),
  };

  try {
    const res = await saveDocSettings(me, input);
    revalidatePath("/settings/documents");
    revalidatePath("/invoices/new");
    revalidatePath("/receipts/new");
    return { ok: true, settings: res.settings };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save the document settings." };
  }
}

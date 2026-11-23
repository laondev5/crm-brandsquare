"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveDocSettingsAction, type DocSettingsFormState } from "@/app/actions/documents";
import type { DocSettings } from "@/lib/types";

/**
 * The one place the papers' letterhead, bank details, signatory and
 * boilerplate are changed.
 *
 * Saving here changes what the next document says. Documents already written
 * keep their own copy, so an invoice sent last month does not change under the
 * customer's feet.
 */
export default function DocumentSettingsForm({ settings }: { settings: DocSettings }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DocSettingsFormState, FormData>(
    saveDocSettingsAction,
    null
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="card qt-form">
      {state?.error && <div className="msg err">{state.error}</div>}
      {state?.ok && <div className="msg ok">Saved. The next document will use these.</div>}

      <h2>The letterhead</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Company name</span>
          <input type="text" name="company_name" defaultValue={settings.company_name} />
        </label>
        <label className="f">
          <span>Tagline</span>
          <input type="text" name="tagline" defaultValue={settings.tagline} />
        </label>
        <label className="f">
          <span>Website</span>
          <input type="text" name="website" defaultValue={settings.website} />
        </label>
        <label className="f">
          <span>Email</span>
          <input type="text" name="email" defaultValue={settings.email} />
        </label>
        <label className="f">
          <span>Signed by</span>
          <input type="text" name="signatory_name" defaultValue={settings.signatory_name} />
        </label>
        <label className="f">
          <span>Their title</span>
          <input type="text" name="signatory_title" defaultValue={settings.signatory_title} />
        </label>
      </div>

      <h2 style={{ marginTop: 22 }}>Bank details for invoices</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
        Copied onto each new invoice. Changing them here leaves invoices already written as they were.
      </p>
      <div className="qt-grid">
        <label className="f">
          <span>Bank</span>
          <input type="text" name="bank_name" defaultValue={settings.bank_name} />
        </label>
        <label className="f">
          <span>Account name</span>
          <input type="text" name="bank_account_name" defaultValue={settings.bank_account_name} />
        </label>
        <label className="f">
          <span>Account number</span>
          <input type="text" name="bank_account_number" defaultValue={settings.bank_account_number} />
        </label>
        <label className="f">
          <span>SWIFT / sort code</span>
          <input type="text" name="bank_swift" defaultValue={settings.bank_swift} />
        </label>
        <label className="f">
          <span>Account currency</span>
          <input type="text" name="bank_currency" defaultValue={settings.bank_currency} placeholder="USD" />
        </label>
      </div>

      <h2 style={{ marginTop: 22 }}>What a new document starts with</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Default currency</span>
          <input type="text" name="default_currency" defaultValue={settings.default_currency} placeholder="NGN" />
        </label>
        <label className="f">
          <span>Quotation validity (days)</span>
          <input type="number" min={1} name="default_valid_days" defaultValue={settings.default_valid_days} />
        </label>
        <label className="f">
          <span>Default VAT %</span>
          <input type="text" inputMode="decimal" name="default_tax_percent" defaultValue={String(settings.default_tax_percent)} />
        </label>
        <label className="f">
          <span>Default share of payment %</span>
          <input
            type="text"
            inputMode="decimal"
            name="default_receipt_share"
            defaultValue={String(settings.default_receipt_share)}
          />
        </label>
      </div>

      <h2 style={{ marginTop: 22 }}>The words around the figures</h2>
      <label className="f">
        <span>Invoice — payment terms</span>
        <textarea name="payment_terms" rows={3} defaultValue={settings.payment_terms} />
      </label>
      <label className="f">
        <span>Invoice — notes</span>
        <textarea name="invoice_notes" rows={3} defaultValue={settings.invoice_notes} />
      </label>
      <label className="f">
        <span>Invoice — next step</span>
        <textarea name="invoice_next_step" rows={2} defaultValue={settings.invoice_next_step} />
      </label>
      <label className="f">
        <span>Quotation — description</span>
        <textarea name="quote_description" rows={3} defaultValue={settings.quote_description} />
      </label>
      <label className="f">
        <span>Quotation — suitable for</span>
        <textarea name="quote_suitable_for" rows={2} defaultValue={settings.quote_suitable_for} />
      </label>
      <label className="f">
        <span>Quotation — key specifications, one per line</span>
        <textarea name="quote_specs" rows={5} defaultValue={settings.quote_specs} />
      </label>
      <label className="f">
        <span>Quotation — notes, one per line</span>
        <textarea name="quote_notes" rows={4} defaultValue={settings.quote_notes} />
      </label>
      <label className="f">
        <span>Quotation — next step</span>
        <textarea name="quote_next_step" rows={2} defaultValue={settings.quote_next_step} />
      </label>
      <label className="f">
        <span>Receipt — terms</span>
        <textarea name="receipt_terms" rows={3} defaultValue={settings.receipt_terms} />
      </label>

      <div className="row" style={{ gap: 10, marginTop: 16 }}>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save the settings"}
        </button>
      </div>
    </form>
  );
}

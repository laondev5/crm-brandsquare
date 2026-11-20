"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveInvoiceAction, type InvoiceFormState } from "@/app/actions/invoices";
import { docTotals, money, readMoney, type DocSettings, type Invoice } from "@/lib/types";
import DocumentCataloguePicker from "@/components/document-catalogue-picker";
import CurrencyPicker from "../quotes/currency-picker";

interface Line {
  key: string;
  description: string;
  qty: string;
  unit_price: string;
}

const blank = (): Line => ({
  key: Math.random().toString(36).slice(2),
  description: "",
  qty: "1",
  unit_price: "",
});

function linesFrom(invoice: Invoice | null): Line[] {
  if (!invoice?.items.length) return [blank()];
  return invoice.items.map((item, i) => ({
    key: `saved-${item.id ?? i}`,
    description: item.description,
    qty: String(item.qty),
    unit_price: String(item.unit_price),
  }));
}

/**
 * A proforma invoice, written from the same lines as the quotation it follows.
 *
 * The bank details are copied into the form from the company's document
 * settings, so an invoice that goes out carries the account the customer must
 * pay into — and keeps it, even after the settings are changed for the next
 * one. The figures are the rep's, as everywhere else.
 */
export default function InvoiceEditor({
  invoice = null,
  prefill,
  defaults,
  canEdit,
}: {
  invoice?: Invoice | null;
  prefill?: {
    quote_id?: number | null;
    org_id?: number | null;
    lead_id?: number | null;
    customer_name?: string;
    customer_company?: string;
    customer_location?: string;
    customer_email?: string;
    customer_phone?: string;
  };
  defaults?: DocSettings | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<InvoiceFormState, FormData>(saveInvoiceAction, null);
  const [lines, setLines] = useState<Line[]>(() => linesFrom(invoice));
  const [tax, setTax] = useState(String(invoice ? invoice.tax_percent : (defaults?.default_tax_percent ?? 7.5)));
  const [currencyCode, setCurrencyCode] = useState(invoice?.currency ?? defaults?.default_currency ?? "NGN");

  useEffect(() => {
    if (!state?.ok || !state.invoice) return;
    if (!invoice) router.replace(`/invoices/${state.invoice.id}`);
    else router.refresh();
  }, [state, invoice, router]);

  const totals = useMemo(
    () =>
      docTotals(
        lines.map((l) => ({ line_total: (readMoney(l.qty) || 0) * readMoney(l.unit_price) })),
        readMoney(tax)
      ),
    [lines, tax]
  );

  const set = (i: number, patch: Partial<Line>) =>
    setLines((all) => all.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const today = new Date().toISOString().slice(0, 10);
  const days = Math.max(1, Math.round(defaults?.default_valid_days ?? 14));
  const validUntil = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  return (
    <form action={action} className="card qt-form">
      <input type="hidden" name="id" value={invoice?.id ?? ""} />
      <input type="hidden" name="quote_id" value={invoice?.quote_id ?? prefill?.quote_id ?? ""} />
      <input type="hidden" name="org_id" value={invoice?.org_id ?? prefill?.org_id ?? ""} />
      <input type="hidden" name="lead_id" value={invoice?.lead_id ?? prefill?.lead_id ?? ""} />

      {state?.error && <div className="msg err">{state.error}</div>}
      {state?.ok && <div className="msg ok">Saved.</div>}

      <h2>Customer details</h2>
      <div className="qt-grid">
        <label className="f">
          <span>
            Customer name <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input
            type="text"
            name="customer_name"
            required
            defaultValue={invoice?.customer_name ?? prefill?.customer_name ?? ""}
            placeholder="Abubakar Suleiman"
          />
        </label>
        <label className="f">
          <span>Company</span>
          <input
            type="text"
            name="customer_company"
            defaultValue={invoice?.customer_company ?? prefill?.customer_company ?? ""}
            placeholder="Kano Agro Ltd"
          />
        </label>
        <label className="f">
          <span>Location</span>
          <input
            type="text"
            name="customer_location"
            defaultValue={invoice?.customer_location ?? prefill?.customer_location ?? ""}
            placeholder="Kano, Nigeria"
          />
        </label>
        <label className="f">
          <span>Phone</span>
          <input
            type="text"
            name="customer_phone"
            defaultValue={invoice?.customer_phone ?? prefill?.customer_phone ?? ""}
            placeholder="+234 801 234 5678"
          />
        </label>
        <label className="f">
          <span>Email</span>
          <input
            type="text"
            name="customer_email"
            defaultValue={invoice?.customer_email ?? prefill?.customer_email ?? ""}
            placeholder="name@company.com"
          />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>Invoice details</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Invoice number</span>
          {invoice ? (
            <input type="text" name="invoice_no" defaultValue={invoice.invoice_no} readOnly />
          ) : (
            <>
              <input type="hidden" name="invoice_no" value="" />
              <input
                type="text"
                value="Assigned automatically when you save"
                readOnly
                tabIndex={-1}
                style={{ background: "var(--band, #f0f2f6)" }}
              />
            </>
          )}
        </label>
        <div className="f-picker">
          <span>Currency</span>
          <CurrencyPicker value={currencyCode} onChange={setCurrencyCode} />
        </div>
        <label className="f">
          <span>Date</span>
          <input type="date" name="issued_on" defaultValue={invoice?.issued_on ?? today} />
        </label>
        <label className="f">
          <span>Valid until</span>
          <input type="date" name="valid_until" defaultValue={invoice?.valid_until ?? validUntil} />
        </label>
        <label className="f">
          <span>VAT %</span>
          <input
            type="text"
            inputMode="decimal"
            name="tax_percent"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            placeholder="7.5"
          />
        </label>
      </div>

      <div className="row" style={{ alignItems: "center", margin: "18px 0 8px" }}>
        <h2 style={{ margin: 0 }}>Line items</h2>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn ghost sm" disabled={!canEdit || pending} onClick={() => setLines((all) => [...all, blank()])}>
          <Plus className="size-3" /> Add a line
        </button>
      </div>
      <DocumentCataloguePicker
        currency={currencyCode}
        canEdit={canEdit && !pending}
        onAdd={({ description, qty, price }) => {
          if (!canEdit || pending) return;
          const line: Line = { ...blank(), description, qty, unit_price: price };
          setLines((all) => {
            const first = all[0];
            return first && first.description === "" && first.qty === "1" && first.unit_price === ""
              ? [line, ...all.slice(1)]
              : [...all, line];
          });
        }}
      />

      <table className="tbl qt-lines">
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ width: 90 }}>Qty</th>
            <th style={{ width: 150 }}>Unit price</th>
            <th style={{ width: 150, textAlign: "right" }}>Amount</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const amount = (readMoney(line.qty) || 0) * readMoney(line.unit_price);
            return (
              <tr key={line.key}>
                <td>
                  <textarea
                    name="item_description"
                    aria-label={`Line ${i + 1} description`}
                    readOnly={!canEdit}
                    rows={Math.min(10, Math.max(2, line.description.split("\n").length))}
                    value={line.description}
                    onChange={(e) => set(i, { description: e.target.value })}
                    placeholder="GD-60B flour mill, complete with destoner and polisher"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="item_qty"
                    aria-label={`Line ${i + 1} quantity`}
                    readOnly={!canEdit}
                    value={line.qty}
                    onChange={(e) => set(i, { qty: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="item_price"
                    aria-label={`Line ${i + 1} unit price (${currencyCode})`}
                    readOnly={!canEdit}
                    value={line.unit_price}
                    onChange={(e) => set(i, { unit_price: e.target.value })}
                    placeholder="12,500,000"
                  />
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{money(amount, currencyCode)}</td>
                <td>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ color: "var(--err)" }}
                    aria-label={`Remove line ${i + 1}`}
                    disabled={!canEdit || pending || lines.length === 1}
                    onClick={() => setLines((all) => all.filter((_, n) => n !== i))}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="qt-totals">
        <div>
          <span>Subtotal</span>
          <strong>{money(totals.subtotal, currencyCode)}</strong>
        </div>
        {readMoney(tax) > 0 && (
          <div>
            <span>VAT {readMoney(tax)}%</span>
            <strong>{money(totals.tax_amount, currencyCode)}</strong>
          </div>
        )}
        <div className="qt-totals__grand">
          <span>Total</span>
          <strong>{money(totals.total, currencyCode)}</strong>
        </div>
      </div>

      <h2 style={{ marginTop: 22 }}>Bank details</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Bank</span>
          <input type="text" name="bank_name" defaultValue={invoice?.bank_name ?? defaults?.bank_name ?? ""} />
        </label>
        <label className="f">
          <span>Account name</span>
          <input
            type="text"
            name="bank_account_name"
            defaultValue={invoice?.bank_account_name ?? defaults?.bank_account_name ?? ""}
          />
        </label>
        <label className="f">
          <span>Account number</span>
          <input
            type="text"
            name="bank_account_number"
            defaultValue={invoice?.bank_account_number ?? defaults?.bank_account_number ?? ""}
          />
        </label>
        <label className="f">
          <span>SWIFT / sort code</span>
          <input type="text" name="bank_swift" defaultValue={invoice?.bank_swift ?? defaults?.bank_swift ?? ""} />
        </label>
        <label className="f">
          <span>Account currency</span>
          <input
            type="text"
            name="bank_currency"
            defaultValue={invoice?.bank_currency ?? defaults?.bank_currency ?? ""}
            placeholder="USD"
          />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>Document content</h2>
      <label className="f">
        <span>Payment terms</span>
        <textarea
          name="payment_terms"
          rows={3}
          defaultValue={invoice?.payment_terms ?? defaults?.payment_terms ?? ""}
          placeholder="50% deposit on order, balance before shipment."
        />
      </label>
      <label className="f">
        <span>Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={invoice?.notes ?? defaults?.invoice_notes ?? ""}
          placeholder="Prices are in USD. Shipping is not included."
        />
      </label>
      <label className="f">
        <span>Next step</span>
        <textarea
          name="next_step"
          rows={2}
          defaultValue={invoice?.next_step ?? defaults?.invoice_next_step ?? ""}
          placeholder="Please pay into the account above and send us the transfer confirmation."
        />
      </label>

      {canEdit ? (
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={pending}>
            {pending ? "Saving…" : invoice ? "Save changes" : "Save invoice"}
          </button>
        </div>
      ) : (
        <p className="empty" style={{ marginTop: 16 }}>
          You can read invoices but not write them.
        </p>
      )}
    </form>
  );
}

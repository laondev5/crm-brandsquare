"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveQuoteAction, type QuoteFormState } from "@/app/actions/quotes";
import { money, readMoney, quoteTotals, type Quote } from "@/lib/types";
import CurrencyPicker from "./currency-picker";

interface Line {
  key: string;
  description: string;
  qty: string;
  unit_price: string;
}

const blank = (): Line => ({ key: Math.random().toString(36).slice(2), description: "", qty: "1", unit_price: "" });

function linesFrom(quote: Quote | null): Line[] {
  if (!quote?.items.length) return [blank()];
  return quote.items.map((item, i) => ({
    key: `saved-${item.id ?? i}`,
    description: item.description,
    qty: String(item.qty),
    unit_price: String(item.unit_price),
  }));
}

/**
 * Writing a quotation.
 *
 * There is no price list behind this and no figure is filled in for anyone:
 * machinery is quoted per enquiry — capacity, spares, installation, whatever
 * was negotiated — so every number on the page is typed by the person
 * quoting. The totals update as they type, which is the only arithmetic done
 * here; the saved figures are the plugin's own, so what is stored can never
 * disagree with what was added up.
 */
export default function QuoteEditor({
  quote = null,
  prefill,
  canEdit,
  onSaved,
}: {
  quote?: Quote | null;
  /** Where the quotation was started from, so the customer is already on it. */
  prefill?: {
    lead_id?: number | null;
    conversation_id?: number | null;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  canEdit: boolean;
  /** Given, the caller keeps the rep where they are -- the chat, say -- and
   *  deals with what happens next itself. */
  onSaved?: (quote: Quote) => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<QuoteFormState, FormData>(saveQuoteAction, null);
  const [lines, setLines] = useState<Line[]>(() => linesFrom(quote));
  const [tax, setTax] = useState(String(quote ? quote.tax_percent : 7.5));
  const [currencyCode, setCurrencyCode] = useState(quote?.currency ?? "NGN");

  // A new quotation lands on its own page once it has an id to live at --
  // unless the caller asked to be told instead, which is how the chat keeps
  // the rep in the conversation they are quoting for.
  useEffect(() => {
    if (!state?.ok || !state.quote) return;
    if (onSaved) onSaved(state.quote);
    else if (!quote) router.replace(`/quotes/${state.quote.id}`);
    else router.refresh();
  }, [state, quote, router, onSaved]);

  const totals = useMemo(
    () =>
      quoteTotals(
        lines.map((l) => ({ qty: readMoney(l.qty) || 0, unit_price: readMoney(l.unit_price) })),
        readMoney(tax)
      ),
    [lines, tax]
  );

  const set = (i: number, patch: Partial<Line>) =>
    setLines((all) => all.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const today = new Date().toISOString().slice(0, 10);
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  return (
    <form action={action} className="card qt-form">
      <input type="hidden" name="id" value={quote?.id ?? ""} />
      <input type="hidden" name="lead_id" value={quote?.lead_id ?? prefill?.lead_id ?? ""} />
      <input
        type="hidden"
        name="conversation_id"
        value={quote?.conversation_id ?? prefill?.conversation_id ?? ""}
      />

      {state?.error && <div className="msg err">{state.error}</div>}
      {state?.ok && <div className="msg ok">Saved.</div>}

      <h2>Who it is for</h2>
      <div className="qt-grid">
        <label className="f">
          <span>
            Customer name <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input
            type="text"
            name="customer_name"
            required
            defaultValue={quote?.customer_name ?? prefill?.name ?? ""}
            placeholder="Abubakar Suleiman"
          />
        </label>
        <label className="f">
          <span>Company</span>
          <input
            type="text"
            name="customer_company"
            defaultValue={quote?.customer_company ?? prefill?.company ?? ""}
            placeholder="Kano Agro Ltd"
          />
        </label>
        <label className="f">
          <span>Phone</span>
          <input
            type="text"
            name="customer_phone"
            defaultValue={quote?.customer_phone ?? prefill?.phone ?? ""}
            placeholder="+234 801 234 5678"
          />
        </label>
        <label className="f">
          <span>Email</span>
          <input
            type="text"
            name="customer_email"
            defaultValue={quote?.customer_email ?? prefill?.email ?? ""}
            placeholder="name@company.com"
          />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>The quotation</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Currency</span>
          <CurrencyPicker value={currencyCode} onChange={setCurrencyCode} />
        </label>
        <label className="f">
          <span>Date</span>
          <input type="date" name="issued_on" defaultValue={quote?.issued_on ?? today} />
        </label>
        <label className="f">
          <span>Valid until</span>
          <input type="date" name="valid_until" defaultValue={quote?.valid_until ?? inTwoWeeks} />
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
        <h2 style={{ margin: 0 }}>What you are quoting</h2>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn ghost sm" onClick={() => setLines((all) => [...all, blank()])}>
          <Plus className="size-3" /> Add a line
        </button>
      </div>

      <table className="tbl qt-lines">
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ width: 90 }}>Qty</th>
            <th style={{ width: 150 }}>Unit price</th>
            <th style={{ width: 140, textAlign: "right" }}>Amount</th>
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
                    rows={2}
                    value={line.description}
                    onChange={(e) => set(i, { description: e.target.value })}
                    placeholder="Rice milling machine, complete line — 2 TPH, with destoner and polisher"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="item_qty"
                    value={line.qty}
                    onChange={(e) => set(i, { qty: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="item_price"
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
                    disabled={lines.length === 1}
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

      {canEdit ? (
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={pending}>
            {pending ? "Saving…" : quote ? "Save changes" : "Save quotation"}
          </button>
          {quote && (
            <small style={{ color: "var(--muted)", alignSelf: "center" }}>
              Saving again after it has gone out changes the record, not the copy the customer has.
            </small>
          )}
        </div>
      ) : (
        <p className="empty" style={{ marginTop: 16 }}>
          You can read quotations but not write them.
        </p>
      )}
    </form>
  );
}

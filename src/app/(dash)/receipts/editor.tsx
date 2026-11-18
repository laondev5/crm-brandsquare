"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveReceiptAction, type ReceiptFormState } from "@/app/actions/receipts";
import { money, readMoney, type DocSettings, type Receipt } from "@/lib/types";
import CurrencyPicker from "../quotes/currency-picker";

interface Line {
  key: string;
  description: string;
  qty: string;
  line_total: string;
}

const blank = (): Line => ({
  key: Math.random().toString(36).slice(2),
  description: "",
  qty: "1",
  line_total: "",
});

function linesFrom(receipt: Receipt | null): Line[] {
  if (!receipt?.items.length) return [blank()];
  return receipt.items.map((item, i) => ({
    key: `saved-${item.id ?? i}`,
    description: item.description,
    qty: String(item.qty),
    line_total: String(item.line_total),
  }));
}

/**
 * A receipt: what actually arrived.
 *
 * The lines carry what was handed over for each item rather than a unit price,
 * because a receipt confirms money rather than asking for it. Several receipts
 * can sit against one invoice, and their sum is what makes it paid.
 */
export default function ReceiptEditor({
  receipt = null,
  prefill,
  defaults,
  canEdit,
}: {
  receipt?: Receipt | null;
  prefill?: {
    invoice_id?: number | null;
    org_id?: number | null;
    lead_id?: number | null;
    customer_name?: string;
    customer_company?: string;
    customer_email?: string;
    customer_phone?: string;
    currency?: string;
    amount_received?: number;
    order_total?: number;
    summary?: string;
    items?: { description: string; qty: number; line_total: number }[];
  };
  defaults?: DocSettings | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReceiptFormState, FormData>(saveReceiptAction, null);
  const [lines, setLines] = useState<Line[]>(() =>
    prefill?.items?.length
      ? prefill.items.map((item, i) => ({
          key: `pre-${i}`,
          description: item.description,
          qty: String(item.qty),
          line_total: String(item.line_total),
        }))
      : linesFrom(receipt)
  );
  const [currencyCode, setCurrencyCode] = useState(
    receipt?.currency ?? prefill?.currency ?? defaults?.default_currency ?? "NGN"
  );
  const [amount, setAmount] = useState(
    receipt ? String(receipt.amount_received) : prefill?.amount_received ? String(prefill.amount_received) : ""
  );
  const [orderTotal, setOrderTotal] = useState(
    receipt ? String(receipt.order_total) : prefill?.order_total ? String(prefill.order_total) : ""
  );

  // The amount that arrived is the fact and the percentage is only its
  // description, so the share follows the two figures instead of being typed
  // on its own -- otherwise a receipt can say 80% next to an amount that is
  // not 80% of the order.
  const share = useMemo(() => {
    const paid = readMoney(amount);
    const total = readMoney(orderTotal);
    if (paid > 0 && total > 0) {
      return String(Math.min(100, Math.round((paid / total) * 10000) / 100));
    }
    return receipt ? String(receipt.share_percent) : "";
  }, [amount, orderTotal, receipt]);

  useEffect(() => {
    if (!state?.ok || !state.receipt) return;
    if (!receipt) router.replace(`/receipts/${state.receipt.id}`);
    else router.refresh();
  }, [state, receipt, router]);

  const itemsTotal = useMemo(
    () => lines.reduce((sum, l) => sum + readMoney(l.line_total), 0),
    [lines]
  );

  const set = (i: number, patch: Partial<Line>) =>
    setLines((all) => all.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="card qt-form">
      <input type="hidden" name="id" value={receipt?.id ?? ""} />
      <input type="hidden" name="invoice_id" value={receipt?.invoice_id ?? prefill?.invoice_id ?? ""} />
      <input type="hidden" name="org_id" value={receipt?.org_id ?? prefill?.org_id ?? ""} />
      <input type="hidden" name="lead_id" value={receipt?.lead_id ?? prefill?.lead_id ?? ""} />

      {state?.error && <div className="msg err">{state.error}</div>}
      {state?.ok && <div className="msg ok">Saved.</div>}

      <h2>Who paid</h2>
      <div className="qt-grid">
        <label className="f">
          <span>
            Customer name <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input
            type="text"
            name="customer_name"
            required
            defaultValue={receipt?.customer_name ?? prefill?.customer_name ?? ""}
            placeholder="Abubakar Suleiman"
          />
        </label>
        <label className="f">
          <span>Company</span>
          <input
            type="text"
            name="customer_company"
            defaultValue={receipt?.customer_company ?? prefill?.customer_company ?? ""}
            placeholder="Kano Agro Ltd"
          />
        </label>
        <label className="f">
          <span>Phone</span>
          <input
            type="text"
            name="customer_phone"
            defaultValue={receipt?.customer_phone ?? prefill?.customer_phone ?? ""}
          />
        </label>
        <label className="f">
          <span>Email</span>
          <input
            type="text"
            name="customer_email"
            defaultValue={receipt?.customer_email ?? prefill?.customer_email ?? ""}
          />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>The payment</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Receipt number</span>
          <input
            type="text"
            name="receipt_no"
            defaultValue={receipt?.receipt_no ?? ""}
            placeholder="Leave blank for the next number"
          />
        </label>
        <label className="f">
          <span>Currency</span>
          <CurrencyPicker value={currencyCode} onChange={setCurrencyCode} />
        </label>
        <label className="f">
          <span>Receipt date</span>
          <input type="date" name="receipt_date" defaultValue={receipt?.receipt_date ?? today} />
        </label>
        <label className="f">
          <span>Payment date</span>
          <input type="date" name="payment_date" defaultValue={receipt?.payment_date ?? today} />
        </label>
        <label className="f">
          <span>
            Amount received <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input
            type="text"
            inputMode="decimal"
            name="amount_received"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5,000,000"
          />
        </label>
        <label className="f">
          <span>Share of the order</span>
          <input
            type="text"
            value={share ? `${share}%` : "—"}
            readOnly
            tabIndex={-1}
            aria-live="polite"
            style={{ background: "var(--band, #f0f2f6)" }}
          />
          <input type="hidden" name="share_percent" value={share} />
        </label>
        <label className="f">
          <span>
            Order total <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input
            type="text"
            inputMode="decimal"
            name="order_total"
            required
            value={orderTotal}
            onChange={(e) => setOrderTotal(e.target.value)}
            placeholder="12,500,000"
          />
        </label>
        <label className="f">
          <span>Payment method</span>
          <input
            type="text"
            name="payment_method"
            defaultValue={receipt?.payment_method ?? ""}
            placeholder="Bank transfer"
          />
        </label>
        <label className="f">
          <span>Reference</span>
          <input
            type="text"
            name="payment_reference"
            defaultValue={receipt?.payment_reference ?? ""}
            placeholder="Transfer reference or cheque number"
          />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>What the money was for</h2>
      <table className="tbl qt-lines">
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ width: 90 }}>Qty</th>
            <th style={{ width: 150, textAlign: "right" }}>Amount</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={line.key}>
              <td>
                <textarea
                  name="item_description"
                  rows={2}
                  value={line.description}
                  onChange={(e) => set(i, { description: e.target.value })}
                  placeholder="GD-60B flour mill — deposit"
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
                  name="item_amount"
                  value={line.line_total}
                  onChange={(e) => set(i, { line_total: e.target.value })}
                />
              </td>
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
          ))}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost sm" onClick={() => setLines((all) => [...all, blank()])}>
          <Plus className="size-3" /> Add a line
        </button>
        <div style={{ flex: 1 }} />
        <strong style={{ fontSize: 13.5 }}>Lines total {money(itemsTotal, currencyCode)}</strong>
      </div>

      <h2 style={{ marginTop: 20 }}>What goes on the paper</h2>
      <label className="f">
        <span>Summary</span>
        <textarea
          name="summary"
          rows={2}
          defaultValue={receipt?.summary ?? prefill?.summary ?? ""}
          placeholder="Part payment towards the GD-60B flour mill."
        />
      </label>
      <label className="f">
        <span>Terms</span>
        <textarea
          name="terms"
          rows={3}
          defaultValue={receipt?.terms ?? defaults?.receipt_terms ?? ""}
        />
      </label>
      <label className="f">
        <span>Notes</span>
        <textarea name="notes" rows={2} defaultValue={receipt?.notes ?? ""} />
      </label>

      {canEdit ? (
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={pending}>
            {pending ? "Saving…" : receipt ? "Save changes" : "Save receipt"}
          </button>
        </div>
      ) : (
        <p className="empty" style={{ marginTop: 16 }}>
          You can read receipts but not write them.
        </p>
      )}
    </form>
  );
}

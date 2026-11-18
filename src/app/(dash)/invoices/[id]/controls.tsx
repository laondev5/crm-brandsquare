"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { setInvoiceStatusAction } from "@/app/actions/invoices";
import { receiptFromInvoiceAction } from "@/app/actions/receipts";
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from "@/lib/types";

/**
 * Moving an invoice along by hand, and recording what came in against it.
 *
 * Paid and part paid are normally the receipts' doing — recording one fills
 * the invoice in from itself, and the plugin refuses when nothing is still
 * owed. The dropdown is for sent, accepted, cancelled and the rest.
 */
export default function InvoiceControls({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [recording, startReceipt] = useTransition();
  const owed = invoice.balance ?? Math.max(0, invoice.total - (invoice.paid_total ?? 0));

  function change(next: InvoiceStatus) {
    if (next === invoice.status) return;
    start(async () => {
      setError(null);
      const res = await setInvoiceStatusAction(invoice.id, next);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  function record() {
    startReceipt(async () => {
      setError(null);
      const res = await receiptFromInvoiceAction(invoice.id);
      if ("error" in res) setError(res.error);
      else router.push(`/receipts/${res.receipt.id}`);
    });
  }

  return (
    <div className="card">
      <h2>Where it stands</h2>

      <label className="f">
        <span>Status</span>
        <select
          value={invoice.status}
          disabled={busy}
          onChange={(e) => change(e.target.value as InvoiceStatus)}
        >
          {INVOICE_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="btn"
        onClick={record}
        disabled={recording || busy || owed <= 0}
        style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
      >
        <ReceiptText className="size-3" /> {recording ? "Recording…" : "Record a receipt"}
      </button>
      {owed <= 0 && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
          Nothing is still owed on this invoice.
        </p>
      )}

      {error && (
        <div className="msg err" style={{ marginTop: 10, marginBottom: 0 }}>
          {error}
        </div>
      )}
    </div>
  );
}

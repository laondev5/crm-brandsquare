"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { invoiceFromQuoteAction } from "@/app/actions/invoices";

export default function RaiseInvoice({ quoteId, canWrite }: { quoteId: number; canWrite: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (!canWrite) return null;

  function run() {
    start(async () => {
      setError(null);
      const res = await invoiceFromQuoteAction(quoteId);
      if ("error" in res) setError(res.error);
      else router.push(`/invoices/${res.invoice.id}`);
    });
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" className="btn" onClick={run} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
        <FileSpreadsheet className="size-3" /> {busy ? "Raising…" : "Raise the proforma invoice"}
      </button>
      {error && (
        <div className="msg err" style={{ marginTop: 10, marginBottom: 0 }}>
          {error}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  BUSINESS,
  cataloguePdf,
  invoicePdf,
  loadLogo,
  loadReceiptStamp,
  receiptPdf,
  type Letterhead,
} from "@/lib/doc-pdf";
import {
  brandFrom,
  type CatalogueItem,
  type DocSettings,
  type Invoice,
  type Receipt,
} from "@/lib/types";

async function letterhead(settings: DocSettings | null): Promise<Letterhead> {
  return { ...(settings ? brandFrom(settings) : BUSINESS), logo: await loadLogo() };
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function clean(value: string) {
  return (value || "document").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

export function InvoicePdfButton({
  invoice,
  settings,
  className = "btn ghost",
  label = "Download the PDF",
}: {
  invoice: Invoice;
  settings: DocSettings | null;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const brand = await letterhead(settings);
      save(invoicePdf(invoice, brand), `${clean(invoice.invoice_no)}-${clean(invoice.customer_company || invoice.customer_name)}.pdf`);
    } catch {
      setError("Could not build the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={run} disabled={busy}>
        <Download className="size-3" /> {busy ? "Building…" : label}
      </button>
      {error && (
        <span className="msg err" style={{ display: "block", marginTop: 10, marginBottom: 0 }}>
          {error}
        </span>
      )}
    </>
  );
}

export function ReceiptPdfButton({
  receipt,
  settings,
  className = "btn ghost",
  label = "Download the PDF",
}: {
  receipt: Receipt;
  settings: DocSettings | null;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const [brand, stamp] = await Promise.all([letterhead(settings), loadReceiptStamp()]);
      save(receiptPdf(receipt, brand, stamp), `${clean(receipt.receipt_no)}-${clean(receipt.customer_company || receipt.customer_name)}.pdf`);
    } catch {
      setError("Could not build the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={run} disabled={busy}>
        <Download className="size-3" /> {busy ? "Building…" : label}
      </button>
      {error && (
        <span className="msg err" style={{ display: "block", marginTop: 10, marginBottom: 0 }}>
          {error}
        </span>
      )}
    </>
  );
}

export function CataloguePdfButton({
  items,
  settings,
  className = "btn",
  label = "Download the catalogue",
}: {
  items: CatalogueItem[];
  settings: DocSettings | null;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const brand = await letterhead(settings);
      save(cataloguePdf(items, brand), "Brandsquare-catalogue.pdf");
    } catch {
      setError("Could not build the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={run} disabled={busy || !items.length}>
        <Download className="size-3" /> {busy ? "Building…" : label}
      </button>
      {error && (
        <span className="msg err" style={{ display: "block", marginTop: 10, marginBottom: 0 }}>
          {error}
        </span>
      )}
    </>
  );
}

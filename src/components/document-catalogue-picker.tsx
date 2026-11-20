"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { loadDocumentCatalogueAction } from "@/app/actions/catalogue";
import { catalogueDocumentLine, money, type CatalogueItem } from "@/lib/types";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type CatalogueLine = Pick<ReturnType<typeof catalogueDocumentLine>, "description" | "qty" | "price">;

export default function DocumentCataloguePicker({
  currency,
  canEdit,
  onAdd,
}: {
  currency: string;
  canEdit: boolean;
  onAdd: (line: CatalogueLine) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadDocumentCatalogueAction>> | null>(null);
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState({ count: 0, text: "" });
  const [omittedPrice, setOmittedPrice] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open || !canEdit) return;
    let cancelled = false;
    setResult(null);
    loadDocumentCatalogueAction()
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(() => {
        if (!cancelled) setResult({ error: "Could not load the catalogue. Try again, or add a line manually." });
      });
    // Ignore a late response after closing, retrying or losing edit access.
    return () => { cancelled = true; };
  }, [open, canEdit, retry]);

  const items = result && "items" in result ? result.items : null;
  const shown = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (items ?? []).filter((item) => {
      const text = [item.name, item.model, item.category, item.description, item.specs].join(" ").toLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }, [items, query]);

  function add(item: CatalogueItem) {
    if (!canEdit) return;
    const line = catalogueDocumentLine(item, currency);
    onAdd({ description: line.description, qty: line.qty, price: line.price });
    const priceNote = !line.currencyMatches
      ? `Catalogue currency ${item.currency || "not specified"} differs from ${currency}. Price left blank; no conversion performed.`
      : line.price === ""
        ? "No valid catalogue price; price left blank."
        : `Price copied in ${currency}.`;
    if (line.price === "") setOmittedPrice(true);
    setNotice((previous) => ({
      count: previous.count + 1,
      text: `Added ${item.name}${item.model ? ` (${item.model})` : ""}. ${priceNote}`,
    }));
  }

  const feedback = (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" style={{ fontSize: 13, margin: 0 }}>
        {notice.count > 0 && `${notice.text} ${notice.count} catalogue line${notice.count === 1 ? "" : "s"} added.`}
      </p>
      {omittedPrice && (
        <p role="alert" className="msg err" style={{ margin: "8px 0" }}>
          Some catalogue prices were left blank because the currency differed or the price was unavailable.
          Enter amounts in the document currency for those lines before saving. No currency conversion is performed.
        </p>
      )}
    </>
  );

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
        Keep machine breakdowns in the{" "}
        <Link href="/catalogue" target="_blank" rel="noopener noreferrer" className="underline">
          catalogue (opens in a new tab)
        </Link>.
        {" "}Add a copy here and edit it for this customer. Save the quote, raise its proforma invoice,
        then create a receipt from that invoice to reuse the line items without retyping.
      </p>
      <Dialog open={open && canEdit} onOpenChange={(next) => {
        if (next && !canEdit) return;
        if (next) { setQuery(""); setResult(null); }
        setOpen(next);
      }}>
        <DialogTrigger asChild>
          <button type="button" className="btn ghost sm" disabled={!canEdit}>
            <Plus className="size-3" aria-hidden="true" /> Add from catalogue
          </button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-2xl"
          onOpenAutoFocus={(event) => { event.preventDefault(); search.current?.focus(); }}
        >
          <DialogHeader>
            <DialogTitle>Add from catalogue</DialogTitle>
            <DialogDescription>
              Copy the machine name, model, description and full specifications into an editable line,
              with quantity 1. Prices are copied only when they match the document currency ({currency}).
              You can add the same machine more than once.
            </DialogDescription>
          </DialogHeader>
          <label className="f" htmlFor={`${id}-search`}>
            <span>Search machines</span>
            <input
              id={`${id}-search`}
              ref={search}
              type="search"
              value={query}
              placeholder="Name, model, category or specifications"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
              aria-controls={`${id}-results`}
            />
          </label>
          <div id={`${id}-results`} aria-busy={result === null}>
            <p role="status" style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px" }}>
              {result === null ? "Loading catalogue…" : items
                ? items.length === 0 ? "No active machines in the catalogue yet. Add a line manually or ask an admin to update the catalogue."
                  : shown.length === 0 ? "No machines match your search. Try a different name or model."
                    : `${shown.length} machine${shown.length === 1 ? "" : "s"} found. Tab to an Add button, then press Enter or Space.`
                : ""}
            </p>
            {result && "error" in result && (
              <div>
                <p role="alert" className="msg err">{result.error}</p>
                <button type="button" className="btn ghost sm" onClick={() => setRetry((n) => n + 1)}>
                  Try again
                </button>
              </div>
            )}
            {items && shown.length > 0 && (
              <ul aria-label="Catalogue machines" style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "40vh", overflowY: "auto" }}>
                {shown.map((item) => {
                  const line = catalogueDocumentLine(item, currency);
                  const priceId = `${id}-price-${item.id}`;
                  return (
                    <li key={item.id} style={{ borderBottom: "1px solid var(--line)", padding: "12px 0" }}>
                      <div className="row" style={{ alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                          <strong>{item.name}</strong>
                          {item.model && <span> — {item.model}</span>}
                          {item.category && <small style={{ display: "block", color: "var(--muted)" }}>{item.category}</small>}
                        </div>
                        <button
                          type="button"
                          className="btn ghost sm"
                          disabled={!canEdit}
                          aria-label={`Add ${item.name}${item.model ? ` (${item.model})` : ""}`}
                          aria-describedby={priceId}
                          onClick={() => add(item)}
                        >
                          <Plus className="size-3" aria-hidden="true" /> Add
                        </button>
                      </div>
                      <p id={priceId} style={{ fontSize: 12.5, margin: "6px 0 0", color: line.currencyMatches ? "var(--muted)" : "var(--err)" }}>
                        Catalogue price: {Number.isFinite(item.price) && item.currency ? money(item.price, item.currency, false) : "Unavailable"}.
                        {!line.currencyMatches
                          ? ` Currency differs from ${currency}: price will be left blank. Enter it manually; no conversion.`
                          : line.price === "" ? " Price will be left blank; enter it manually." : " Price will be copied."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {feedback}
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="btn">Done</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!open && feedback}
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
        Catalogue prices are starting points. Review them before saving. Changing the document currency
        does not convert existing line amounts.
      </p>
    </div>
  );
}

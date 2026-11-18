"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { BUSINESS, cataloguePdf, loadLogo } from "@/lib/doc-pdf";
import { brandFrom, money, type CatalogueItem, type DocSettings } from "@/lib/types";

/**
 * The catalogue as a table you tick through.
 *
 * A sales rep rarely sends the whole catalogue — usually three or four
 * machines that answer the enquiry — so the download takes the ticked rows and
 * falls back to everything shown when nothing is ticked.
 */
export default function CataloguePicker({
  items,
  settings,
}: {
  items: CatalogueItem[];
  settings: DocSettings | null;
}) {
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChosen = items.length > 0 && items.every((item) => chosen.has(item.id));
  const selected = useMemo(() => items.filter((item) => chosen.has(item.id)), [items, chosen]);

  function toggle(id: number) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChosen(allChosen ? new Set() : new Set(items.map((item) => item.id)));
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const brand = { ...(settings ? brandFrom(settings) : BUSINESS), logo: await loadLogo() };
      const blob = cataloguePdf(selected.length ? selected : items, brand);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Brandsquare-catalogue.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not build the catalogue PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <small style={{ color: "var(--muted)" }}>
          {selected.length ? `${selected.length} picked` : `${items.length} shown — all go on the PDF`}
        </small>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={download} disabled={busy || !items.length}>
          <Download className="size-3" /> {busy ? "Building…" : "Download the catalogue"}
        </button>
      </div>
      {error && <div className="msg err">{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allChosen}
                  onChange={toggleAll}
                  aria-label="Pick every machine shown"
                />
              </th>
              <th>Machine</th>
              <th>Category</th>
              <th>Model</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={chosen.has(item.id)}
                    onChange={() => toggle(item.id)}
                    aria-label={`Pick ${item.name}`}
                  />
                </td>
                <td>
                  <Link href={`/catalogue/${item.id}`} style={{ fontWeight: 600 }}>
                    {item.name}
                  </Link>
                  {item.description && (
                    <>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{item.description}</small>
                    </>
                  )}
                </td>
                <td className="tbl-keep">{item.category || "—"}</td>
                <td className="tbl-keep">{item.model || "—"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                  {money(item.price, item.currency)}
                </td>
                <td className="tbl-keep">
                  <span className={`pill ${item.active ? "s-accepted" : "s-draft"}`}>
                    {item.active ? "Listed" : "Retired"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

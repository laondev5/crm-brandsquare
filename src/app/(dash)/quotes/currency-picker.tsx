"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COMMON_CURRENCIES, CURRENCIES_BY_NAME, currency, currencyLabel } from "@/lib/currencies";

/**
 * Choosing the currency by typing rather than scrolling.
 *
 * Fifty currencies is too many for a plain dropdown — nobody scrolls to find
 * the Tanzanian shilling — so this filters on the code and the name alike:
 * "tan", "tzs" and "shilling" all find it. The value still reaches the form
 * through an ordinary hidden input, so the quotation saves the same way it
 * always did whether this is used or not.
 */
export default function CurrencyPicker({
  value,
  onChange,
  name = "currency",
}: {
  value: string;
  onChange: (code: string) => void;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const chosen = currency(value);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = q
      ? CURRENCIES_BY_NAME.filter(
          (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        )
      : // Unsearched, the two that get used sit above the rest.
        [
          ...COMMON_CURRENCIES.map((code) => currency(code)).filter((c) => c !== undefined),
          ...CURRENCIES_BY_NAME.filter((c) => !COMMON_CURRENCIES.includes(c.code)),
        ];
    return all;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    setCursor(Math.max(0, shown.findIndex((c) => c.code === value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clicking anywhere else puts it away, the way a dropdown should behave.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  function pick(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  function keys(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((n) => {
        const next = e.key === "ArrowDown" ? n + 1 : n - 1;
        return Math.max(0, Math.min(shown.length - 1, next));
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[cursor]) pick(shown[cursor].code);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="cur" ref={box}>
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        className="cur__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{chosen ? currencyLabel(chosen) : value || "Pick a currency"}</span>
        <ChevronDown className="size-3" aria-hidden="true" />
      </button>

      {open && (
        <div className="cur__panel">
          <div className="cur__search">
            <Search className="size-3" aria-hidden="true" />
            <input
              ref={field}
              type="text"
              value={query}
              placeholder="Type a country, name or code"
              aria-label="Search currencies"
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={keys}
            />
          </div>

          <ul className="cur__list" role="listbox">
            {shown.length === 0 && <li className="cur__none">Nothing matches “{query}”.</li>}
            {shown.map((c, i) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === value}
                  className={`cur__option${i === cursor ? " is-cursor" : ""}${c.code === value ? " is-on" : ""}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => pick(c.code)}
                >
                  <b>{c.code}</b>
                  <span>{c.name}</span>
                  {c.symbol && <em>{c.symbol}</em>}
                  {c.code === value && <Check className="size-3" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

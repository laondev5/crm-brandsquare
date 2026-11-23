"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { convertMoney } from "./fx";
import { useMarketRates } from "./use-market-rates";

/** What the catalogue said, kept on a line so it can be re-priced later. */
export interface CatalogueBasis {
  price: number;
  currency: string;
}

/**
 * Keeps lines copied from the catalogue in step with the document currency.
 *
 * Only lines carrying a basis are touched: a saved line, or an amount someone
 * typed, has no catalogue figure behind it and is never rewritten. The rate
 * may still be in flight when the currency changes, so the conversion waits
 * for the market table and runs once, at the price the catalogue actually
 * quotes.
 */
export function useCataloguePricing<T extends { basis?: CatalogueBasis | null }>({
  setLines,
  currency,
  setCurrency,
  amount,
}: {
  setLines: Dispatch<SetStateAction<T[]>>;
  currency: string;
  setCurrency: Dispatch<SetStateAction<string>>;
  amount: "unit_price" | "line_total";
}) {
  const fx = useMarketRates();
  const [pending, setPending] = useState<string | null>(null);
  const [convertedTo, setConvertedTo] = useState<string | null>(null);

  useEffect(() => {
    if (!pending || pending !== currency || !Object.keys(fx.rates).length) return;

    setLines((all) =>
      all.map((line) => {
        if (!line.basis) return line;
        const next = convertMoney(line.basis.price, line.basis.currency, pending, fx.rates);
        return next === null ? line : ({ ...line, [amount]: String(next) } as T);
      })
    );
    setConvertedTo(pending);
    setPending(null);
  }, [pending, currency, fx.rates, amount, setLines]);

  return {
    /** Set after a conversion, so the form can say what it did. */
    convertedTo,
    onCurrencyChange(next: string) {
      if (next === currency) return;
      setCurrency(next);
      setConvertedTo(null);
      setPending(next);
    },
  };
}

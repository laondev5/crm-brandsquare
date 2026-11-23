/**
 * Market exchange rates.
 *
 * A catalogue price is written in the currency the machine is sold in — USD
 * for the Chinese suppliers, NGN for a local order. A receipt in another
 * currency needs today's rate, not one typed into the form, so the rate is
 * fetched from a public market feed and cached for an hour.
 *
 * Every rate is requested against USD, which makes one snapshot enough to
 * convert between any two currencies: the cross rate is the target's rate
 * divided by the source's. That also means changing the document currency
 * does not need another request.
 */

export interface FxSnapshot {
  base: string;
  rates: Record<string, number>;
  /** When the provider last updated its table, as it prints it. */
  updated: string | null;
}

const SOURCE = "https://open.er-api.com/v6/latest/";
const HOUR = 60 * 60 * 1000;

export const EMPTY_FX: FxSnapshot = { base: "USD", rates: {}, updated: null };

/** Only a table that arrived is kept. A failed request is retried on the next
 *  call rather than remembered for an hour — a receipt form that says "no rate"
 *  because the network blinked once should recover by itself. */
const cache = new Map<string, { snapshot: FxSnapshot; at: number }>();

/** The provider's table, kept for an hour. A failure is a snapshot with no
 *  rates rather than an exception: a receipt can still be written by hand. */
export async function marketRates(base = "USD"): Promise<FxSnapshot> {
  const code = base.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return { ...EMPTY_FX, base: code || "USD" };

  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < HOUR) return hit.snapshot;

  try {
    const res = await fetch(`${SOURCE}${code}`, { cache: "no-store" });
    if (!res.ok) return { base: code, rates: {}, updated: null };

    const json = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    if (json.result !== "success" || !json.rates) return { base: code, rates: {}, updated: null };

    const snapshot: FxSnapshot = {
      base: code,
      rates: json.rates,
      updated: json.time_last_update_utc ?? null,
    };
    cache.set(code, { snapshot, at: Date.now() });
    return snapshot;
  } catch {
    return { base: code, rates: {}, updated: null };
  }
}

/** How many `to` one `from` buys. Null when either currency is missing. */
export function unitRate(
  from: string,
  to: string,
  rates: Record<string, number>
): number | null {
  const f = (from || "").trim().toUpperCase();
  const t = (to || "").trim().toUpperCase();
  if (!f || !t) return null;
  if (f === t) return 1;

  const rf = rates[f];
  const rt = rates[t];
  if (!rf || !rt || rf <= 0 || rt <= 0) return null;
  return rt / rf;
}

/** An amount moved into another currency at the market rate, to the cent. */
export function convertMoney(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number | null {
  if (!Number.isFinite(amount)) return null;
  const rate = unitRate(from, to, rates);
  if (rate === null) return null;
  return Math.round(amount * rate * 100) / 100;
}

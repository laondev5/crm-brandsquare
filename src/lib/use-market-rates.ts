"use client";

import { useEffect, useState } from "react";
import { EMPTY_FX, type FxSnapshot } from "./fx";

/**
 * The market table, fetched once for the whole tab.
 *
 * The catalogue picker and the receipt form both need it, and they mount on
 * the same screen; a cached promise means the second one waits on the first
 * request rather than making its own.
 */
let cached: FxSnapshot | null = null;
let pending: Promise<FxSnapshot> | null = null;

function load(): Promise<FxSnapshot> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch("/api/fx?base=USD")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FxSnapshot | null) => {
        const snapshot = data && typeof data.rates === "object" ? data : EMPTY_FX;
        cached = snapshot;
        return snapshot;
      })
      .catch(() => EMPTY_FX)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useMarketRates(): FxSnapshot & { loading: boolean } {
  const [snapshot, setSnapshot] = useState<FxSnapshot>(cached ?? EMPTY_FX);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let live = true;
    load().then((data) => {
      if (!live) return;
      setSnapshot(data);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  return { ...snapshot, loading };
}

/** "Mon, 23 Nov 2026 00:02:32 +0000" read as a short date, or null. */
export function rateDay(updated: string | null): string | null {
  if (!updated) return null;
  const date = new Date(updated);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

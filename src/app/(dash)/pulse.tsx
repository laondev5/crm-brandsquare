"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Pulse } from "@/lib/types";

const POLL_MS = 30_000;

const EMPTY: Pulse = { unread: 0, soon: [], invites: [], announcements: [] };

interface PulseState extends Pulse {
  /** When the last answer arrived, for counting down between checks. */
  fetchedAt: number;
  /** Ask again now -- after marking something read, say. */
  refresh: () => void;
}

const Ctx = createContext<PulseState>({ ...EMPTY, fetchedAt: 0, refresh: () => {} });

export const usePulse = () => useContext(Ctx);

/**
 * One live check for the whole CRM, shared by the bell and the pop-ups, so
 * each open tab asks the server once every half minute rather than once per
 * thing that wants to know. Also asks again whenever the tab comes back into
 * focus, which is when a stale count would be noticed.
 */
export default function PulseProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Pulse>(EMPTY);
  const [fetchedAt, setFetchedAt] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/pulse", { cache: "no-store" });
      if (!r.ok) return;
      setData({ ...EMPTY, ...(await r.json()) });
      setFetchedAt(Date.now());
    } catch {
      // Offline for a moment; the next check catches up.
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return <Ctx.Provider value={{ ...data, fetchedAt, refresh }}>{children}</Ctx.Provider>;
}

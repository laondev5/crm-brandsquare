"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 4000;

/**
 * Keeps the inbox current without a page reload.
 *
 * Checks the pulse route every few seconds while the tab is in view and
 * reloads the page's data when the fingerprint differs from what is on
 * screen. A refresh keeps client state, so a half-typed reply or a search
 * term survives it. Checking stops while the tab is hidden and resumes, with
 * an immediate check, the moment it is looked at again.
 */
export default function LiveInbox({
  sig,
  conversationId,
  search,
}: {
  sig: string;
  conversationId: number | null;
  search: string;
}) {
  const router = useRouter();
  const shown = useRef(sig);

  // Every render from the server carries the fingerprint of what it drew —
  // after a refresh, a send, or a switch of thread alike.
  useEffect(() => {
    shown.current = sig;
  }, [sig]);

  useEffect(() => {
    let busy = false;
    let stopped = false;

    const check = async () => {
      if (busy || stopped || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const p = new URLSearchParams();
        if (conversationId) p.set("c", String(conversationId));
        if (search) p.set("q", search);
        const r = await fetch(`/api/whatsapp/pulse?${p}`, { cache: "no-store" });
        if (!r.ok) return;
        const { sig: latest } = (await r.json()) as { sig?: string };
        if (!stopped && latest && latest !== shown.current) {
          shown.current = latest;
          router.refresh();
        }
      } catch {
        // A dropped connection just means the next check tries again.
      } finally {
        busy = false;
      }
    };

    const timer = setInterval(check, EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [conversationId, search, router]);

  return null;
}

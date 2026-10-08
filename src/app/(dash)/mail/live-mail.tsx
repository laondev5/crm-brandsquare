"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 10000;

/**
 * Keeps the email inbox current without a page reload.
 *
 * The same idea as the WhatsApp inbox, slower: mail does not need to be seen
 * within four seconds, and each check gives WordPress a chance to ask Gmail for
 * anything new, which is not free. Checks only while the tab is in view, and
 * reloads the page's data only when the fingerprint WordPress returns differs
 * from the one the page was drawn with.
 */
export default function LiveMail({ sig, threadId }: { sig: string; threadId: number | null }) {
  const router = useRouter();
  const shown = useRef(sig);

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
        const r = await fetch(`/api/mail/pulse${threadId ? `?t=${threadId}` : ""}`, { cache: "no-store" });
        if (!r.ok) return;
        const { sig: latest } = (await r.json()) as { sig?: string };
        if (!stopped && latest && shown.current && latest !== shown.current) {
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
  }, [threadId, router]);

  return null;
}

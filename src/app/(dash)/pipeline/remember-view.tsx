"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const KEY = "bsq_pipeline_view";

/**
 * Remembers whether this person works from the board or the list.
 *
 * The choice is per person, not per installation: someone who runs their day
 * off the table should not have it reset to the board every morning because a
 * colleague prefers cards. It is stored in the browser rather than on the
 * server because it is a preference about this screen, not data anyone else
 * needs — and it survives a reload, which is the whole ask.
 *
 * The view stays in the URL as the source of truth so a link still opens what
 * it says. This only fills in the blank: arriving at /pipeline with nothing
 * specified redirects once to whichever view was last chosen.
 */
export default function RememberView({ current }: { current: "board" | "list" }) {
  const router = useRouter();

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // Private windows and blocked site data both throw here. A remembered
      // preference is a convenience, so losing it must not break the screen.
      return;
    }

    const url = new URL(window.location.href);
    const asked = url.searchParams.get("view");

    // Nothing asked for and something remembered that differs: go there once.
    if (!asked && saved === "list") {
      url.searchParams.set("view", "list");
      router.replace(url.pathname + url.search);
      return;
    }

    // Otherwise the URL wins, and becomes what we remember.
    if (asked || saved !== current) {
      try {
        localStorage.setItem(KEY, current);
      } catch {
        /* not worth reporting */
      }
    }
  }, [current, router]);

  return null;
}

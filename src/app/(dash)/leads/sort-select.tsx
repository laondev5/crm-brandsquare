"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LEAD_SORTS, type LeadSort } from "@/lib/types";

/**
 * How the list is ordered.
 *
 * A dropdown that needed a separate "apply" click would be worse than no
 * dropdown at all, so this navigates on change. The ordering lives in the URL
 * rather than in component state, which keeps it in the browser history, on a
 * shared link, and available to the server that actually does the sorting.
 */
export default function SortSelect({ current }: { current: LeadSort }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, start] = useTransition();

  return (
    <select
      aria-label="Sort leads"
      value={current}
      disabled={busy}
      style={{ width: 170 }}
      onChange={(e) => {
        const p = new URLSearchParams(params.toString());
        p.set("sort", e.target.value);
        // Re-ordering changes what is on page one, so staying on page 4 would
        // land you somewhere arbitrary in the new order.
        p.delete("page");
        start(() => router.push(`/leads?${p.toString()}`));
      }}
    >
      {LEAD_SORTS.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

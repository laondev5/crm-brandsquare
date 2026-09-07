"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteViewAction, saveViewAction } from "@/app/actions/views";
import type { SavedView } from "@/lib/types";

/**
 * Named filters over the leads list.
 *
 * A view stores the querystring the page already reads, so saving one is
 * really just remembering the URL someone worked out — there is no second
 * filter language to keep in step with the tabs and the search box, and a
 * filter added to the page later is savable the day it ships.
 */
export default function ViewsBar({
  views,
  currentQuery,
}: {
  views: SavedView[];
  /** The filters currently on screen, as a querystring without the leading ?. */
  currentQuery: string;
}) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, startTransition] = useTransition();

  const save = () => {
    setErr("");
    startTransition(async () => {
      const res = await saveViewAction(name, currentQuery);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setName("");
      setNaming(false);
      router.refresh();
    });
  };

  const remove = (v: SavedView) => {
    if (!confirm(`Remove the saved view "${v.name}"? The leads themselves are untouched.`)) return;
    setErr("");
    startTransition(async () => {
      const res = await deleteViewAction(v.id);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="views">
      {views.map((v) => {
        const href = v.query ? `/leads?${v.query}` : "/leads";
        const on = v.query === currentQuery;
        return (
          <span key={v.id} className={`viewchip${on ? " on" : ""}`}>
            <Link href={href}>{v.name}</Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(v)}
              aria-label={`Remove saved view ${v.name}`}
            >
              ✕
            </button>
          </span>
        );
      })}

      {naming ? (
        <span className="row" style={{ gap: 6 }}>
          <input
            type="text"
            autoFocus
            value={name}
            maxLength={120}
            placeholder="Name this view"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setNaming(false);
            }}
            style={{ width: 180 }}
          />
          <button type="button" className="btn sm" disabled={busy || !name.trim()} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setNaming(false)}>
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" className="btn ghost sm" onClick={() => setNaming(true)}>
          + Save this view
        </button>
      )}

      {err && <span style={{ color: "var(--err)", fontSize: 12 }}>{err}</span>}
    </div>
  );
}

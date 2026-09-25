"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteQuoteAction, setQuoteStatusAction } from "@/app/actions/quotes";
import { QUOTE_STATUSES, type Quote, type QuoteStatus as Status } from "@/lib/types";

/**
 * Where a quotation stands, and getting rid of one.
 *
 * Sending sets it to Sent by itself; this is for what happens afterwards —
 * the customer agreed, or they did not. Deleting is an admin's, because a
 * quotation that went to a customer is a record of what was offered.
 */
export default function QuoteStatus({ quote, canDelete }: { quote: Quote; canDelete: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, start] = useTransition();

  const move = (status: Status) =>
    start(async () => {
      setError(null);
      const res = await setQuoteStatusAction(quote.id, status);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });

  const remove = () =>
    start(async () => {
      setError(null);
      const res = await deleteQuoteAction(quote.id);
      if ("error" in res) setError(res.error);
      else router.replace("/quotes");
    });

  return (
    <div className="card">
      <h2>Where it stands</h2>
      {error && <div className="msg err">{error}</div>}

      <div className="seg" style={{ flexWrap: "wrap" }}>
        {QUOTE_STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`seg__btn${quote.status === s.key ? " is-on" : ""}`}
            title={s.note}
            disabled={busy || quote.status === s.key}
            onClick={() => move(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {canDelete && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          {asking ? (
            <>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
                Delete {quote.ref} and its lines? It cannot be undone, and a quotation the customer
                already has is a record of what was offered.
              </p>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{ background: "var(--err)", borderColor: "var(--err)" }}
                  onClick={remove}
                  disabled={busy}
                >
                  {busy ? "Deleting…" : "Delete it"}
                </button>
                <button type="button" className="btn ghost sm" onClick={() => setAsking(false)} disabled={busy}>
                  Keep it
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="btn ghost sm"
              style={{ color: "var(--err)" }}
              onClick={() => setAsking(true)}
            >
              Delete this quotation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

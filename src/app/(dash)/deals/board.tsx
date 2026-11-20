"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Deal, Stage } from "@/lib/types";
import { money } from "@/lib/types";
import { moveDealAction } from "@/app/actions/deals";

export interface DealColumn {
  stage: Stage;
  total: number;
  value: number;
  deals: Deal[];
}

export default function DealsBoard({ columns, writableDealIds }: { columns: DealColumn[]; writableDealIds: number[] }) {
  const writable = new Set(writableDealIds);
  const [cols, setCols] = useState(columns);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // The server revalidates after every move; adopt its grouping whenever it
  // actually changes, without wiping an optimistic move still in flight.
  const sig = JSON.stringify(columns.map((c) => [c.stage.key, c.total, c.deals.map((d) => d.id)]));
  const lastSig = useRef(sig);
  useEffect(() => {
    if (lastSig.current !== sig) {
      lastSig.current = sig;
      setCols(columns);
    }
  }, [sig, columns]);

  function move(dealId: number, to: string) {
    if (!writable.has(dealId)) return;
    const from = cols.find((c) => c.deals.some((d) => d.id === dealId));
    if (!from || from.stage.key === to) return;
    const deal = from.deals.find((d) => d.id === dealId)!;
    const target = cols.find((c) => c.stage.key === to);
    if (!target) return;

    const before = cols;
    setError("");
    setCols((cur) =>
      cur.map((c) => {
        if (c.stage.key === from.stage.key) {
          return {
            ...c,
            total: Math.max(0, c.total - 1),
            value: Math.max(0, c.value - deal.amount),
            deals: c.deals.filter((d) => d.id !== dealId),
          };
        }
        if (c.stage.key === to) {
          return {
            ...c,
            total: c.total + 1,
            value: c.value + deal.amount,
            deals: [{ ...deal, stage: to, stage_label: c.stage.label, stage_type: c.stage.type }, ...c.deals],
          };
        }
        return c;
      })
    );

    startTransition(async () => {
      const res = await moveDealAction(dealId, to);
      if ("error" in res) {
        setCols(before);
        setError(res.error);
      }
    });
  }

  return (
    <>
      {error && (
        <div className="msg err" role="alert">
          {error}
        </div>
      )}

      <div className="board">
        {cols.map((col) => (
          <section
            key={col.stage.key}
            className={`board-col${overCol === col.stage.key ? " is-over" : ""}`}
            onDragOver={(e) => {
              if (dragId === null || !writable.has(dragId)) return;
              e.preventDefault();
              if (overCol !== col.stage.key) setOverCol(col.stage.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              const id = Number(e.dataTransfer.getData("text/plain")) || dragId;
              setDragId(null);
              if (id) move(id, col.stage.key);
            }}
          >
            <header className="board-col__head is-stage" style={{ ["--stage" as string]: col.stage.colour }}>
              <span className="board-dot is-stage" aria-hidden="true" />
              <h2>{col.stage.label}</h2>
              <b title={`${col.total} deal${col.total === 1 ? "" : "s"} · ${col.stage.probability}% probability`}>
                {col.total}
              </b>
            </header>

            <div className="board-col__body">
              <p className="board-msg" style={{ marginTop: 0 }}>
                {col.value > 0 ? money(col.value, col.deals[0]?.currency ?? "NGN") : "—"}
              </p>

              {col.deals.length === 0 ? (
                <p className="board-msg">No deals in this stage.</p>
              ) : (
                col.deals.map((deal) => (
                  <article
                    key={deal.id}
                    className={`board-card${dragId === deal.id ? " is-dragging" : ""}`}
                    draggable={writable.has(deal.id)}
                    onDragStart={(e) => {
                      if (!writable.has(deal.id)) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData("text/plain", String(deal.id));
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(deal.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                  >
                    <Link href={`/deals/${deal.id}`} className="board-card__name">
                      {deal.title}
                    </Link>
                    <p className="board-card__contact">{deal.org_name || deal.lead_company || deal.lead_name || "No customer record"}</p>

                    <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>
                      {money(deal.amount, deal.currency)}
                    </div>

                    <div className="board-card__meta">
                      <span>{deal.owner || "Unassigned"}</span>
                      <span className="board-card__date">
                        {deal.close_date ? `Close ${deal.close_date.slice(0, 10)}` : deal.ref}
                      </span>
                    </div>

                    {writable.has(deal.id) && (
                      <label className="board-card__move">
                        <span className="sr-only">Move {deal.title} to another stage</span>
                        <select value={deal.stage} onChange={(e) => move(deal.id, e.target.value)}>
                          {cols.map((c) => (
                            <option key={c.stage.key} value={c.stage.key}>
                              {c.stage.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

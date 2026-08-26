"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { moveLeadAction } from "@/app/actions/pipeline";

export interface BoardCard {
  id: number;
  name: string;
  email: string;
  phone: string;
  owner: string | null;
  formName: string | null;
  status: LeadStatus;
  received: string;
  idleDays: number;
  rot: "none" | "warn" | "stale";
}

export interface BoardColumn {
  key: LeadStatus;
  label: string;
  total: number;
  failed: boolean;
  cards: BoardCard[];
}

export default function Board({
  columns,
  canReassign,
  searchTerm = "",
}: {
  columns: BoardColumn[];
  canReassign: boolean;
  /** Carried into the "+N more" links so a search survives the jump to Leads. */
  searchTerm?: string;
}) {
  const [cols, setCols] = useState(columns);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // The server revalidates /pipeline after every move, so new props are the
  // authoritative state — adopt them whenever they actually change. Comparing
  // by value (not identity) keeps an unrelated re-render from wiping an
  // optimistic move that hasn't been confirmed yet.
  const sig = JSON.stringify(columns.map((c) => [c.key, c.total, c.cards.map((k) => k.id)]));
  const lastSig = useRef(sig);
  useEffect(() => {
    if (lastSig.current !== sig) {
      lastSig.current = sig;
      setCols(columns);
    }
  }, [sig, columns]);

  function move(cardId: number, to: LeadStatus) {
    const from = cols.find((c) => c.cards.some((k) => k.id === cardId));
    if (!from || from.key === to) return;
    const card = from.cards.find((k) => k.id === cardId)!;

    const before = cols;
    setError("");
    setCols((cur) =>
      cur.map((c) => {
        if (c.key === from.key) {
          return { ...c, total: Math.max(0, c.total - 1), cards: c.cards.filter((k) => k.id !== cardId) };
        }
        if (c.key === to) {
          // Terminal stages stop counting as rotting the moment they close.
          const moved: BoardCard = {
            ...card,
            status: to,
            idleDays: 0,
            rot: "none",
          };
          return { ...c, total: c.total + 1, cards: [moved, ...c.cards] };
        }
        return c;
      })
    );

    startTransition(async () => {
      const res = await moveLeadAction(cardId, to);
      if ("error" in res) {
        setCols(before); // put it back exactly where it was
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
            key={col.key}
            className={`board-col${overCol === col.key ? " is-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (overCol !== col.key) setOverCol(col.key);
            }}
            onDragLeave={(e) => {
              // Only clear when the pointer actually leaves the column, not
              // when it crosses onto a child card inside it.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              const id = Number(e.dataTransfer.getData("text/plain")) || dragId;
              setDragId(null);
              if (id) move(id, col.key);
            }}
          >
            <header className="board-col__head">
              <span className={`board-dot s-${col.key}`} aria-hidden="true" />
              <h2>{col.label}</h2>
              <b>{col.total}</b>
            </header>

            <div className="board-col__body">
              {col.failed ? (
                <p className="board-msg">Could not load.</p>
              ) : col.cards.length === 0 ? (
                <p className="board-msg">Nothing here.</p>
              ) : (
                col.cards.map((card) => (
                  <article
                    key={card.id}
                    className={`board-card${dragId === card.id ? " is-dragging" : ""}${
                      card.rot !== "none" ? ` is-${card.rot}` : ""
                    }`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(card.id));
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(card.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                  >
                    <Link href={`/leads/${card.id}`} className="board-card__name">
                      {card.name}
                    </Link>

                    {(card.email || card.phone) && (
                      <p className="board-card__contact">{card.email || card.phone}</p>
                    )}

                    <div className="board-card__meta">
                      {card.formName && <span className="board-tag">{card.formName}</span>}
                      {canReassign && <span>{card.owner ?? "Unassigned"}</span>}
                      <span className="board-card__date">{card.received}</span>
                    </div>

                    {card.rot !== "none" && (
                      <p className="board-card__rot">
                        No movement in {card.idleDays} day{card.idleDays === 1 ? "" : "s"}
                      </p>
                    )}

                    {/* Drag is the fast path on a desktop; this is the one that
                        works on a phone, with a keyboard, or with a screen reader. */}
                    <label className="board-card__move">
                      <span className="sr-only">Move {card.name} to another stage</span>
                      <select
                        value={card.status}
                        onChange={(e) => move(card.id, e.target.value as LeadStatus)}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))
              )}

              {col.total > col.cards.length && (
                <Link
                  href={`/leads?status=${col.key}${
                    searchTerm ? `&s=${encodeURIComponent(searchTerm)}` : ""
                  }`}
                  className="board-more"
                >
                  +{col.total - col.cards.length} more in {col.label}
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

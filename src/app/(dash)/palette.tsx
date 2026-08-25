"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { quickSearchAction, type QuickHit } from "@/app/actions/pipeline";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
}

/**
 * Ctrl/Cmd-K jump bar. Static destinations are matched locally so the palette
 * is useful the instant it opens; lead lookup is a server round trip, so it is
 * debounced and its results are appended rather than replacing the list.
 */
export default function Palette({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<QuickHit[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const pages: Cmd[] = [
    { id: "p-dash", label: "Dashboard", hint: "Overview and metrics", href: "/", group: "Go to" },
    { id: "p-pipe", label: "Pipeline", hint: "Drag leads between stages", href: "/pipeline", group: "Go to" },
    { id: "p-leads", label: "Leads", hint: "Full lead list", href: "/leads", group: "Go to" },
    { id: "p-email", label: "Email", hint: "Campaigns and sends", href: "/email", group: "Go to" },
    ...(isAdmin
      ? [
          { id: "p-camp", label: "Campaigns", hint: "Forms and conversion", href: "/campaigns", group: "Go to" },
          { id: "p-team", label: "Team", hint: "Sub-admins and permissions", href: "/team", group: "Go to" },
        ]
      : []),
    { id: "a-new", label: "Add lead", hint: "Enter a lead by hand", href: "/leads/new", group: "Actions" },
    { id: "a-imp", label: "Import leads", hint: "Upload a CSV or Excel file", href: "/leads/import", group: "Actions" },
    { id: "a-send", label: "New email campaign", hint: "Compose and send", href: "/email/new", group: "Actions" },
  ];

  const q = term.trim().toLowerCase();
  const matchedPages = q
    ? pages.filter((c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q))
    : pages;

  const leadCmds: Cmd[] = hits.map((h) => ({
    id: `l-${h.id}`,
    label: h.name,
    hint: h.email || `Stage: ${h.status}`,
    href: `/leads/${h.id}`,
    group: "Leads",
  }));

  const all = [...matchedPages, ...leadCmds];

  const close = useCallback(() => {
    setOpen(false);
    setTerm("");
    setHits([]);
    setSel(0);
  }, []);

  /* open / close shortcut */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /* debounced lead lookup */
  useEffect(() => {
    if (!open) return;
    const s = term.trim();
    if (s.length < 2) {
      setHits([]);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const res = await quickSearchAction(s);
      if (live) setHits(res);
    }, 220);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [term, open]);

  // A shrinking result list must never leave the cursor pointing past the end.
  useEffect(() => {
    setSel((s) => (s >= all.length ? Math.max(0, all.length - 1) : s));
  }, [all.length]);

  function go(cmd: Cmd | undefined) {
    if (!cmd) return;
    close();
    router.push(cmd.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (all.length ? (s + 1) % all.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (all.length ? (s - 1 + all.length) % all.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(all[sel]);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-on="1"]')?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) {
    return (
      <button className="palette-trigger" onClick={() => setOpen(true)}>
        <span>Search or jump to…</span>
        <kbd>Ctrl K</kbd>
      </button>
    );
  }

  let lastGroup = "";

  return (
    <div className="palette-back" onMouseDown={close} role="presentation">
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search and navigate"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="palette-input"
          placeholder="Search leads, or jump to a page…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Search leads or jump to a page"
        />

        <ul className="palette-list" ref={listRef}>
          {all.length === 0 && <li className="palette-none">No matches.</li>}
          {all.map((cmd, i) => {
            const head = cmd.group !== lastGroup ? ((lastGroup = cmd.group), cmd.group) : null;
            return (
              <li key={cmd.id}>
                {head && <p className="palette-group">{head}</p>}
                <button
                  type="button"
                  data-on={i === sel ? "1" : "0"}
                  className={`palette-item${i === sel ? " is-on" : ""}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(cmd)}
                >
                  <b>{cmd.label}</b>
                  {cmd.hint && <span>{cmd.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </footer>
      </div>
    </div>
  );
}

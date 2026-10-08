"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { deleteMailThreadsAction, mailToLeadsAction } from "@/app/actions/mail";
import type { MailList, MailThread } from "@/lib/types";

const PER_PAGE = 40;

function initial(name: string) {
  const c = name.trim().charAt(0);
  return c ? c.toUpperCase() : "#";
}

function relTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The address in the URL for a given view of the list. */
function hrefFor(o: { t?: number | null; q?: string; f?: string; p?: number }) {
  const p = new URLSearchParams();
  if (o.q) p.set("q", o.q);
  if (o.f) p.set("f", o.f);
  if (o.p && o.p > 1) p.set("p", String(o.p));
  if (o.t) p.set("t", String(o.t));
  const s = p.toString();
  return `/mail${s ? `?${s}` : ""}`;
}

/** What one conversation looks like in the list, whether or not it is a link. */
function Row({ t }: { t: MailThread }) {
  return (
    <>
      <span className="wa-row__avatar">{initial(t.display_name)}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <strong
            style={{
              fontSize: 13,
              color: "var(--ink)",
              fontWeight: t.unread_count > 0 ? 700 : 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t.display_name}
            {t.is_new && (
              <span className="wa-first" title="Nobody here has replied yet">
                New
              </span>
            )}
          </strong>
          <small style={{ color: "var(--muted)", flexShrink: 0, fontSize: 11 }}>{relTime(t.last_message_at)}</small>
        </span>
        <span
          style={{
            display: "block",
            fontSize: 12.5,
            color: "var(--ink)",
            fontWeight: t.unread_count > 0 ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginTop: 1,
          }}
        >
          {t.subject || "(no subject)"}
        </span>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
          <small
            style={{
              color: "var(--muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 12,
            }}
          >
            {t.last_direction === "out" && "You: "}
            {t.snippet || "—"}
          </small>
          {t.unread_count > 0 && <span className="mail-unread">{t.unread_count}</span>}
        </span>
        {t.lead_id && (
          <small
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 11,
              color: t.assigned_name ? "var(--p)" : "var(--warn, #b8860b)",
            }}
          >
            {t.assigned_name ? `Assigned to ${t.assigned_name}` : "Unassigned"}
          </small>
        )}
      </span>
    </>
  );
}

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "new", label: "Not replied" },
];

export default function MailListPane({
  data,
  selected,
  search,
  filter,
  page,
  canAddLeads,
  canRemove,
}: {
  data: MailList;
  selected: number | null;
  search: string;
  filter: string;
  page: number;
  canAddLeads: boolean;
  /** Admins and up. */
  canRemove: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  const canPick = canAddLeads || canRemove;
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, startRemove] = useTransition();
  const [adding, startAdding] = useTransition();

  const threads = data.threads;
  const pages = Math.max(1, Math.ceil(data.total / PER_PAGE));

  // Typing waits a moment before searching: every search reads the whole
  // mailbox's text, so one per keystroke would be a lot to ask of the server.
  const onSearch = (next: string) => {
    setQ(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => startTransition(() => router.replace(hrefFor({ q: next.trim(), f: filter, t: selected }))),
      350
    );
  };

  const stopChoosing = () => {
    setChoosing(false);
    setPicked([]);
    setConfirming(false);
    setError(null);
  };

  const toggle = (id: number) => setPicked((all) => (all.includes(id) ? all.filter((n) => n !== id) : [...all, id]));
  const allShown = threads.map((t) => t.id);
  const everyone = picked.length > 0 && picked.length === allShown.length;

  const addToLeads = () =>
    startAdding(async () => {
      setError(null);
      const res = await mailToLeadsAction(picked);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      const parts = [];
      if (res.created) parts.push(`${res.created} added to leads`);
      if (res.linked) parts.push(`${res.linked} matched an existing lead`);
      if (res.already) parts.push(`${res.already} already linked`);
      if (res.failed.length) parts.push(`${res.failed.length} could not be added`);
      setNote(parts.join(", ") || "Nothing to add");
      setPicked([]);
      router.refresh();
    });

  const remove = () =>
    startRemove(async () => {
      const res = await deleteMailThreadsAction(picked);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      const openWasRemoved = selected !== null && picked.includes(selected);
      stopChoosing();
      router.replace(hrefFor({ q: search, f: filter, p: page, t: openWasRemoved ? null : selected }));
      router.refresh();
    });

  return (
    <div
      className="mail-list-pane"
      style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
        <input
          type="text"
          placeholder="Search people, subjects, text"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          style={{ width: "100%" }}
        />
        <div className="mail-tabs" role="tablist" aria-label="Show">
          {FILTERS.map((f) => {
            const count = f.key === "unread" ? data.unread_total : f.key === "new" ? data.new_total : 0;
            return (
              <Link
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                href={hrefFor({ q: search, f: f.key, t: selected })}
                className={`mail-tab${filter === f.key ? " is-on" : ""}`}
              >
                {f.label}
                {count > 0 && <em>{count}</em>}
              </Link>
            );
          })}
        </div>

        {canPick && threads.length > 0 && (
          <div className="wa-pick__bar">
            {choosing ? (
              <>
                <button type="button" className="btn ghost sm" onClick={stopChoosing}>
                  Done
                </button>
                <button type="button" className="btn ghost sm" onClick={() => setPicked(everyone ? [] : allShown)}>
                  {everyone ? "None" : "All"}
                </button>
                <div className="spacer" />
                {canAddLeads && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={picked.length === 0 || adding}
                    title="Add these people to the leads list"
                    onClick={addToLeads}
                  >
                    <UserPlus className="size-3" /> {adding ? "Adding…" : "To leads"}
                  </button>
                )}
                {canRemove && (
                  <button
                    type="button"
                    className="btn sm"
                    style={{ background: "var(--err)", borderColor: "var(--err)" }}
                    disabled={picked.length === 0 || busy}
                    title="Remove these from the CRM's inbox"
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2 className="size-3" /> {picked.length || ""}
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="btn ghost sm" onClick={() => setChoosing(true)}>
                {canRemove ? "Select conversations" : "Select to add as leads"}
              </button>
            )}
          </div>
        )}
        {(note || (error && !confirming)) && (
          <p
            className="wa-pick__note"
            role="status"
            style={error ? { color: "var(--err)" } : undefined}
            onClick={() => {
              setNote(null);
              setError(null);
            }}
          >
            {error ?? note}
          </p>
        )}
      </div>

      {confirming && (
        <div className="wa-pick__confirm" role="alertdialog" aria-label="Confirm removal">
          <strong>
            Remove {picked.length} conversation{picked.length === 1 ? "" : "s"} from the CRM?
          </strong>
          <p>
            They disappear from this inbox for everyone. Nothing is deleted in Gmail, and a new message in{" "}
            {picked.length === 1 ? "it" : "any of them"} brings {picked.length === 1 ? "it" : "that one"} back.
          </p>
          {error && <div className="msg err">{error}</div>}
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn sm"
              style={{ background: "var(--err)", borderColor: "var(--err)" }}
              onClick={remove}
              disabled={busy}
            >
              {busy ? "Removing…" : "Remove"}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirming(false)} disabled={busy}>
              Keep them
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {threads.length === 0 ? (
          <p className="empty" style={{ padding: "24px 16px" }}>
            {search
              ? "No conversation matches that."
              : filter === "unread"
                ? "Nothing unread."
                : filter === "new"
                  ? "Everyone who wrote in has had a reply."
                  : data.status.importing
                    ? "Nothing yet — the first import is still running."
                    : "No conversations yet."}
          </p>
        ) : (
          threads.map((t) =>
            choosing ? (
              // While choosing, the whole row toggles rather than navigating.
              <label key={t.id} className={`wa-row is-picking${picked.includes(t.id) ? " is-picked" : ""}`}>
                <input
                  type="checkbox"
                  checked={picked.includes(t.id)}
                  onChange={() => toggle(t.id)}
                  aria-label={`Select the conversation with ${t.display_name}`}
                />
                <Row t={t} />
              </label>
            ) : (
              <Link
                key={t.id}
                href={hrefFor({ q: search, f: filter, p: page, t: t.id })}
                className={`wa-row${t.id === selected ? " is-open" : ""}`}
              >
                <Row t={t} />
              </Link>
            )
          )
        )}
      </div>

      {pages > 1 && (
        <div className="mail-pager">
          {page > 1 ? (
            <Link href={hrefFor({ q: search, f: filter, p: page - 1 })} className="btn ghost sm">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <small>
            Page {page} of {pages}
          </small>
          {page < pages ? (
            <Link href={hrefFor({ q: search, f: filter, p: page + 1 })} className="btn ghost sm">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

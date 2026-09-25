"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { addWaToLeadsAction, deleteWaConversationsAction } from "@/app/actions/whatsapp";
import type { WaConversation } from "@/lib/types";

function initial(name: string) {
  const c = name.trim().replace("+", "").charAt(0);
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

/** What one conversation looks like in the list, whether or not it is a link. */
function Row({ c }: { c: WaConversation }) {
  return (
    <>
      <span className="wa-row__avatar">{initial(c.display_name)}</span>

      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <strong
            style={{
              fontSize: 13,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.display_name}
            {/* Nobody here has ever replied: a stranger who wrote in and is
                still waiting, which is the one thing worth spotting from
                across a shared inbox. */}
            {c.is_new && (
              <span className="wa-first" title="First time they have written — nobody has replied yet">
                New
              </span>
            )}
          </strong>
          <small style={{ color: "var(--muted)", flexShrink: 0, fontSize: 11 }}>
            {relTime(c.last_message_at)}
          </small>
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
            {c.last_direction === "out" && "You: "}
            {c.last_message_preview || "—"}
          </small>
          {c.unread_count > 0 && <span className="wa-row__unread">{c.unread_count}</span>}
        </span>

        {/* Who owns this, at a glance -- a shared inbox still needs to say
            whose lead this is before anyone opens it. */}
        {c.lead_id && (
          <small
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 11,
              color: c.assigned_name ? "var(--p)" : "var(--warn, #b8860b)",
            }}
          >
            {c.assigned_name ? `Assigned to ${c.assigned_name}` : "Unassigned"}
          </small>
        )}
      </span>
    </>
  );
}

export default function ConversationList({
  conversations,
  selected,
  search,
  canDelete = false,
  canAddLeads = false,
}: {
  conversations: WaConversation[];
  selected: number | null;
  search: string;
  /** Admins and up. Deleting destroys the record of what was said to a
   *  customer, so it is not a tidy-up anyone in the inbox can do. */
  canDelete?: boolean;
  /** Whoever may add a lead by hand. Unlike deleting, this is ordinary work. */
  canAddLeads?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);
  const [, startTransition] = useTransition();

  const canPick = canDelete || canAddLeads;
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, startDelete] = useTransition();
  const [adding, startAdding] = useTransition();

  const go = (next: string) => {
    setQ(next);
    startTransition(() => {
      const p = new URLSearchParams();
      if (next) p.set("q", next);
      if (selected) p.set("c", String(selected));
      router.replace(`/whatsapp?${p}`);
    });
  };

  const stopChoosing = () => {
    setChoosing(false);
    setPicked([]);
    setConfirming(false);
    setError(null);
  };

  const addToLeads = () =>
    startAdding(async () => {
      setError(null);
      const res = await addWaToLeadsAction(picked);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      // Three different outcomes, and which one happened is the point of the
      // check -- "added 2" and "matched 2 who were already customers" are not
      // the same news.
      const parts = [];
      if (res.created) parts.push(`${res.created} added to leads`);
      if (res.linked) parts.push(`${res.linked} matched an existing lead`);
      if (res.already) parts.push(`${res.already} already linked`);
      setNote(parts.join(", ") || "Nothing to add");
      setPicked([]);
      router.refresh();
    });

  const toggle = (id: number) =>
    setPicked((all) => (all.includes(id) ? all.filter((n) => n !== id) : [...all, id]));

  const allShown = conversations.map((c) => c.id);
  const everyone = picked.length > 0 && picked.length === allShown.length;

  const remove = () =>
    startDelete(async () => {
      const res = await deleteWaConversationsAction(picked);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      // If the thread on screen was one of them, the pane beside this has
      // nothing left to show, so the selection goes with it.
      const openWasDeleted = selected !== null && picked.includes(selected);
      stopChoosing();
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (!openWasDeleted && selected) p.set("c", String(selected));
      router.replace(`/whatsapp?${p}`);
      router.refresh();
    });

  return (
    <div
      style={{
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
        <input
          type="text"
          placeholder="Search name or number"
          value={q}
          onChange={(e) => go(e.target.value)}
          style={{ width: "100%" }}
        />
        {canPick && conversations.length > 0 && (
          <div className="wa-pick__bar">
            {choosing ? (
              <>
                <button type="button" className="btn ghost sm" onClick={stopChoosing}>
                  Done
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setPicked(everyone ? [] : allShown)}
                >
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
                {canDelete && (
                  <button
                    type="button"
                    className="btn sm"
                    style={{ background: "var(--err)", borderColor: "var(--err)" }}
                    disabled={picked.length === 0 || busy}
                    title="Delete these conversations"
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2 className="size-3" /> {picked.length || ""}
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="btn ghost sm" onClick={() => setChoosing(true)}>
                {canDelete ? "Select conversations" : "Select to add as leads"}
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
        <div className="wa-pick__confirm" role="alertdialog" aria-label="Confirm deletion">
          <strong>
            Delete {picked.length} conversation{picked.length === 1 ? "" : "s"}?
          </strong>
          <p>
            Every message in {picked.length === 1 ? "it" : "them"}, and every photo, voice note and
            document, is removed from the CRM for everyone. It cannot be undone. If that number
            writes again, a new conversation starts.
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
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirming(false)} disabled={busy}>
              Keep them
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {conversations.length === 0 ? (
          <p className="empty" style={{ padding: "24px 16px" }}>
            {search ? "No conversation matches that." : "No conversations yet."}
          </p>
        ) : (
          conversations.map((c) =>
            choosing ? (
              // While choosing, the whole row toggles rather than navigating:
              // opening a thread by accident in the middle of picking what to
              // delete is how the wrong one gets deleted.
              <label key={c.id} className={`wa-row is-picking${picked.includes(c.id) ? " is-picked" : ""}`}>
                <input
                  type="checkbox"
                  checked={picked.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  aria-label={`Select the conversation with ${c.display_name}`}
                />
                <Row c={c} />
              </label>
            ) : (
              <Link
                key={c.id}
                href={`/whatsapp?c=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`wa-row${c.id === selected ? " is-open" : ""}`}
              >
                <Row c={c} />
              </Link>
            )
          )
        )}
      </div>
    </div>
  );
}

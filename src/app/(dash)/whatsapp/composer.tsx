"use client";

import { useActionState, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sendWaMessageAction, type SendWaState } from "@/app/actions/whatsapp";
import { fillResponse, fillTemplate, groupBySection, type KbItem, type MessageTemplate } from "@/lib/types";

/** One ready-made message, already filled with this contact's details. */
interface Reply {
  key: string;
  group: string;
  title: string;
  text: string;
}

/** Blanks still to fill: [Machine Name] from response templates, {{company}} from quick replies. */
const BLANK = /\[[^\]\n]{1,40}\]|\{\{\s*\w+\s*\}\}/g;

/**
 * The reply area of a conversation: the thread above, the message box below,
 * and the ready-made replies in a panel on the right.
 *
 * The panel shows each reply in full, with the contact's name already in it,
 * so choosing one is reading it rather than guessing from a title. Clicking
 * one puts it in the box, which grows to fit so the whole message can be
 * checked and edited before it goes. Blanks the CRM cannot fill ([Machine
 * Name]) are highlighted, and the first one is selected ready to type over.
 */
export default function Composer({
  conversationId,
  header,
  children,
  extra,
  quickReplies = [],
  responses = [],
  meName = "",
  vars = {},
}: {
  conversationId: number;
  /** The contact's name and lead status; the Replies button joins this row. */
  header?: React.ReactNode;
  /** The conversation itself: messages and any notices. */
  children?: React.ReactNode;
  /** Sits beside Send -- the template picker, where there are templates. */
  extra?: React.ReactNode;
  /** Saved WhatsApp wording, dropped into the box with this contact's details. */
  quickReplies?: MessageTemplate[];
  /** The team's response templates, filled with this contact's name and yours. */
  responses?: KbItem[];
  meName?: string;
  vars?: { name?: string; email?: string; phone?: string; company?: string };
}) {
  const [state, action, pending] = useActionState<SendWaState, FormData>(sendWaMessageAction, {});
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  // Every category starts closed; a reply's full text shows only when clicked.
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [preview, setPreview] = useState("");

  const replies = useMemo<Reply[]>(() => {
    const first = vars.name?.trim().split(/\s+/)[0];
    return [
      ...quickReplies.map((t) => ({
        key: `q:${t.id}`,
        group: "Quick replies",
        title: t.name,
        text: fillTemplate(t.body, vars),
      })),
      ...groupBySection(responses).flatMap((g) =>
        g.items.map((r) => ({
          key: `r:${r.id}`,
          group: g.section || "Response templates",
          title: r.title,
          text: fillResponse(r.body, { name: first, yourName: meName }),
        }))
      ),
    ];
  }, [quickReplies, responses, vars, meName]);

  const hasReplies = replies.length > 0;
  const q = query.trim().toLowerCase();
  const shown = q
    ? replies.filter((r) => r.title.toLowerCase().includes(q) || r.text.toLowerCase().includes(q))
    : replies;
  const groups = shown.reduce<{ group: string; items: Reply[] }[]>((out, r) => {
    const g = out.find((x) => x.group === r.group);
    if (g) g.items.push(r);
    else out.push({ group: r.group, items: [r] });
    return out;
  }, []);

  // Beside the chat on a wide screen; on a narrower one it would cover the
  // messages, so it starts closed there and opens from the Replies button.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1180px)").matches) setPanelOpen(false);
  }, []);

  // Cleared after a successful send: the box should be empty again the moment
  // the last message is on its way.
  useEffect(() => {
    if (state.ok) {
      setText("");
      setPicked("");
    }
  }, [state.ok]);

  // The box grows with what is in it, up to about half the chat, so a long
  // ready-made reply can be read in full rather than through a one-line slot.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 340)}px`;
  }, [text]);

  function use(r: Reply) {
    if (text.trim() && text !== r.text && !confirm("Replace what you have typed with this reply?")) return;
    setText(r.text);
    setPicked(r.key);
    // On a smaller screen the panel covers the chat; get it out of the way
    // so the message can be read and edited.
    if (window.matchMedia("(max-width: 1180px)").matches) setPanelOpen(false);
    // Put the cursor where work is left: on the first blank if there is one,
    // otherwise at the end.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const m = new RegExp(BLANK.source).exec(r.text);
      if (m) el.setSelectionRange(m.index, m.index + m[0].length);
      else el.setSelectionRange(r.text.length, r.text.length);
    });
  }

  const blanksLeft = (text.match(BLANK) ?? []).length;

  return (
    <div className={`wa-desk${hasReplies && panelOpen ? " has-panel" : ""}`}>
      <div className="wa-desk__main">
        <div className="wa-thread-head">
          {header}
          {hasReplies && (
            <button
              type="button"
              className={`btn sm ${panelOpen ? "" : "ghost"}`}
              aria-pressed={panelOpen}
              onClick={() => setPanelOpen((o) => !o)}
              title={panelOpen ? "Hide ready-made replies" : "Show ready-made replies"}
            >
              {panelOpen ? "Hide replies" : "Replies"}
            </button>
          )}
        </div>
        {children}

        <div style={{ borderTop: "1px solid var(--line)", background: "#fff" }}>
          {state.error && (
            <p style={{ margin: 0, padding: "6px 10px 0", fontSize: 12, color: "var(--err)" }}>{state.error}</p>
          )}
          {blanksLeft > 0 && (
            <p style={{ margin: 0, padding: "6px 10px 0", fontSize: 12, color: "#8a5a00" }}>
              {blanksLeft} blank{blanksLeft === 1 ? "" : "s"} still to fill in, like{" "}
              <strong>{text.match(BLANK)![0]}</strong>. The first one is selected: just type over it.
            </p>
          )}
          <form
            action={action}
            style={{ padding: 10, display: "flex", gap: 8, alignItems: "flex-end" }}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter writes a newline -- the WhatsApp app's
              // own convention, so it needs no explanation on screen.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget as HTMLFormElement).requestSubmit();
              }
            }}
          >
            <input type="hidden" name="conversation_id" value={conversationId} />
            <textarea
              ref={ref}
              name="text"
              placeholder="Type a message, or pick a ready-made reply on the right"
              rows={1}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ flex: 1, resize: "vertical", minHeight: 40, lineHeight: 1.5 }}
            />
            {extra}
            <button type="submit" className="btn" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>

      {hasReplies && panelOpen && (
        <aside className="wa-desk__panel" aria-label="Ready-made replies">
          <div className="wa-desk__panel-head">
            <strong>Ready-made replies</strong>
            <button type="button" className="wa-desk__close" onClick={() => setPanelOpen(false)} aria-label="Close">
              ×
            </button>
            <input
              type="search"
              placeholder="Search replies…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search replies"
            />
            <small>Open a category, click a reply to preview it, then press Use this reply.</small>
          </div>

          <div className="wa-desk__list">
            {groups.length === 0 && <p className="empty">No reply matches “{query}”.</p>}
            {groups.map((g) => {
              // Searching opens every category that has a match, so results
              // are not hidden behind a closed heading.
              const open = !!q || openGroups.includes(g.group);
              return (
                <section key={g.group} className={`wa-cat${open ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="wa-cat__head"
                    aria-expanded={open}
                    onClick={() =>
                      setOpenGroups((all) =>
                        all.includes(g.group) ? all.filter((x) => x !== g.group) : [...all, g.group]
                      )
                    }
                  >
                    <span className="wa-cat__chev" aria-hidden="true">›</span>
                    <span className="wa-cat__name">{g.group}</span>
                    <span className="wa-cat__count">{g.items.length}</span>
                  </button>

                  {open &&
                    g.items.map((r) => {
                      const previewing = preview === r.key;
                      return (
                        <div
                          key={r.key}
                          className={`wa-reply${previewing ? " is-open" : ""}${picked === r.key ? " is-picked" : ""}`}
                        >
                          <button
                            type="button"
                            className="wa-reply__title"
                            aria-expanded={previewing}
                            onClick={() => setPreview(previewing ? "" : r.key)}
                          >
                            {r.title}
                            {picked === r.key && <em>In the box</em>}
                          </button>
                          {previewing && (
                            <>
                              <span className="wa-reply__text">{highlight(r.text)}</span>
                              <button type="button" className="btn sm wa-reply__use" onClick={() => use(r)}>
                                Use this reply
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                </section>
              );
            })}
          </div>
        </aside>
      )}
    </div>
  );
}

/** Marks the blanks in a preview so it is obvious what still needs typing. */
function highlight(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(BLANK)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(<mark key={m.index}>{m[0]}</mark>);
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

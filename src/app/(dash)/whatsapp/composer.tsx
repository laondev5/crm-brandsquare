"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendWaMessageAction, type SendWaState } from "@/app/actions/whatsapp";
import { fillResponse, fillTemplate, groupBySection, type KbItem, type MessageTemplate } from "@/lib/types";

export default function Composer({
  conversationId,
  extra,
  quickReplies = [],
  responses = [],
  meName = "",
  vars = {},
}: {
  conversationId: number;
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

  // Cleared after a successful send rather than left for the user to select
  // and delete — the whole point of a chat box is that it is empty again the
  // moment the last thing you typed is on its way.
  useEffect(() => {
    if (state.ok && ref.current) ref.current.value = "";
  }, [state.ok]);

  return (
    <div style={{ borderTop: "1px solid var(--line)" }}>
      {(quickReplies.length > 0 || responses.length > 0) && (
        <div style={{ padding: "8px 10px 0" }}>
          <select
            value=""
            aria-label="Quick reply"
            style={{ fontSize: 12.5 }}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith("r:") && ref.current) {
                const r = responses.find((x) => `r:${x.id}` === v);
                if (r) {
                  ref.current.value = fillResponse(r.body, { name: vars.name?.split(" ")[0], yourName: meName });
                  ref.current.focus();
                }
                return;
              }
              const t = quickReplies.find((x) => String(x.id) === v);
              if (t && ref.current) {
                ref.current.value = fillTemplate(t.body, vars);
                ref.current.focus();
              }
            }}
          >
            <option value="">Quick reply…</option>
            {quickReplies.length > 0 && (
              <optgroup label="Quick replies">
                {quickReplies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
            {groupBySection(responses).map((g) => (
              <optgroup key={g.section} label={`Response templates — ${g.section}`}>
                {g.items.map((r) => (
                  <option key={r.id} value={`r:${r.id}`}>
                    {r.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      {state.error && (
        <p style={{ margin: 0, padding: "6px 10px 0", fontSize: 12, color: "var(--err)" }}>{state.error}</p>
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
          placeholder="Type a message"
          rows={1}
          required
          style={{ flex: 1, resize: "none", maxHeight: 120 }}
        />
        {extra}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

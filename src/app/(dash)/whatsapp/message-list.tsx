"use client";

import { useLayoutEffect, useRef } from "react";
import type { WaMessage } from "@/lib/types";
import MessageBubble from "./message-bubble";

/**
 * The thread's scrolling area. Opens at the newest message, and follows new
 * ones as they arrive — unless someone has scrolled up to read back, in which
 * case yanking them to the bottom would lose their place. Their own sent
 * message always brings them down, since they just wrote it.
 */
export default function MessageList({
  conversationId,
  messages,
}: {
  conversationId: number;
  messages: WaMessage[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const seen = useRef<{ conversation: number; count: number } | null>(null);
  const nearBottom = useRef(true);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const before = seen.current;
    const switched = !before || before.conversation !== conversationId;
    const grew = !switched && messages.length > before.count;
    const mine = messages[messages.length - 1]?.direction === "out";

    if (switched || (grew && (nearBottom.current || mine))) el.scrollTop = el.scrollHeight;
    seen.current = { conversation: conversationId, count: messages.length };
  }, [conversationId, messages]);

  return (
    <div
      ref={box}
      onScroll={(e) => {
        const el = e.currentTarget;
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
      style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}
    >
      {messages.length === 0 ? (
        <p className="empty" style={{ padding: 24 }}>
          No messages yet.
        </p>
      ) : (
        messages.map((m) => <MessageBubble key={m.id} message={m} />)
      )}
    </div>
  );
}

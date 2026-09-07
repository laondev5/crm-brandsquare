"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

export default function ConversationList({
  conversations,
  selected,
  search,
}: {
  conversations: WaConversation[];
  selected: number | null;
  search: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);
  const [, startTransition] = useTransition();

  const go = (next: string) => {
    setQ(next);
    startTransition(() => {
      const p = new URLSearchParams();
      if (next) p.set("q", next);
      if (selected) p.set("c", String(selected));
      router.replace(`/whatsapp?${p}`);
    });
  };

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
      </div>

      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {conversations.length === 0 ? (
          <p className="empty" style={{ padding: "24px 16px" }}>
            {search ? "No conversation matches that." : "No conversations yet."}
          </p>
        ) : (
          conversations.map((c) => {
            const on = c.id === selected;
            return (
              <Link
                key={c.id}
                href={`/whatsapp?c=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line)",
                  background: on ? "var(--accent)" : "transparent",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "#e8e8ee",
                    color: "var(--ink)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {initial(c.display_name)}
                </span>

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
                    </strong>
                    <small style={{ color: "var(--muted)", flexShrink: 0, fontSize: 11 }}>
                      {relTime(c.last_message_at)}
                    </small>
                  </span>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
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
                    {c.unread_count > 0 && (
                      <span
                        style={{
                          background: "#25D366",
                          color: "#fff",
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 700,
                          minWidth: 16,
                          height: 16,
                          display: "grid",
                          placeItems: "center",
                          padding: "0 4px",
                          flexShrink: 0,
                        }}
                      >
                        {c.unread_count}
                      </span>
                    )}
                  </span>

                  {/* Who owns this, at a glance -- a shared inbox still needs
                      to say whose lead this is before anyone opens it. */}
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
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

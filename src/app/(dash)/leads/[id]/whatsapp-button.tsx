"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { openLeadChatAction } from "@/app/actions/whatsapp";

/**
 * Opens this lead's chat in the CRM's own inbox, starting one if they have
 * never been messaged. Replying there rather than from a personal phone keeps
 * the chat on the business number and in the history the whole team sees --
 * which is also where the next person to pick the lead up will look.
 */
export default function WhatsAppButton({ leadId }: { leadId: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  return (
    <>
      {err && (
        <span role="alert" style={{ color: "var(--err)", fontSize: 12, maxWidth: 260 }}>
          {err}
        </span>
      )}
      <button
        type="button"
        className="btn"
        style={{ background: "#25D366" }}
        disabled={busy}
        onClick={() => {
          setErr("");
          start(async () => {
            const res = await openLeadChatAction(leadId);
            if ("error" in res) setErr(res.error);
            else router.push(`/whatsapp?c=${res.conversationId}`);
          });
        }}
      >
        <MessageCircle className="size-4" aria-hidden="true" style={{ marginRight: 4 }} />
        {busy ? "Opening…" : "WhatsApp"}
      </button>
    </>
  );
}

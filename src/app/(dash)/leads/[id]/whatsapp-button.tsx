"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, MessageCircle } from "lucide-react";
import { openLeadChatAction } from "@/app/actions/whatsapp";
import { logWhatsAppOpenAction } from "@/app/actions/leads";

/** Set when WhatsApp is being worked on the phone instead of in the CRM. */
export interface ExternalWhatsApp {
  /** A wa.me link to the lead with the greeting already in it; null when the lead has no usable number. */
  href: string | null;
  /** The chat kept here from before, when there is one to read. */
  conversationId: number | null;
}

/**
 * The lead's WhatsApp button.
 *
 * Normally it opens this lead's chat in the CRM's own inbox, starting one if
 * they have never been messaged: replying there rather than from a personal
 * phone keeps the chat on the business number and in the history the whole
 * team sees.
 *
 * When the team has moved to the ordinary WhatsApp Business app, the inbox can
 * no longer send, so the button opens WhatsApp itself -- the app on a phone,
 * WhatsApp Web on a computer -- on a chat with this lead and the greeting
 * ready to send. It is a plain link, so it works with nothing else loaded,
 * and the visit is written to the lead's timeline on the way.
 */
export default function WhatsAppButton({ leadId, external }: { leadId: number; external?: ExternalWhatsApp }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  if (external) {
    return (
      <>
        {external.href ? (
          <a
            className="btn"
            style={{ background: "#25D366" }}
            href={external.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // Fire and forget: the link opens regardless of whether the note is saved.
              void logWhatsAppOpenAction(leadId, true);
            }}
          >
            <MessageCircle className="size-4" aria-hidden="true" style={{ marginRight: 4 }} />
            WhatsApp
          </a>
        ) : (
          <button
            type="button"
            className="btn"
            style={{ background: "#25D366", opacity: 0.55, cursor: "not-allowed" }}
            disabled
            title="This lead's phone number could not be read as a WhatsApp number. Fix it under Contact details."
          >
            <MessageCircle className="size-4" aria-hidden="true" style={{ marginRight: 4 }} />
            WhatsApp
          </button>
        )}
        {external.conversationId && (
          <Link
            href={`/whatsapp?c=${external.conversationId}`}
            className="btn ghost"
            title="What was said in the CRM before the team moved to the WhatsApp Business app"
          >
            <History className="size-4" aria-hidden="true" style={{ marginRight: 4 }} />
            Chat history
          </Link>
        )}
      </>
    );
  }

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

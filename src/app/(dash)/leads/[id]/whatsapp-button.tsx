"use client";

import { whatsAppLink } from "@/lib/phone";
import { logWhatsAppOpenAction } from "../../../actions/leads";

/**
 * A real <a href> so the chat opens even if JS fails to load — no click
 * handler stands between the user and WhatsApp. The activity-log call rides
 * alongside it, fired and forgotten; a failed log never blocks the message.
 */
export default function WhatsAppButton({ leadId, phone }: { leadId: number; phone: string }) {
  const link = whatsAppLink(phone);
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="btn"
      style={{ background: "#25D366" }}
      onClick={() => {
        logWhatsAppOpenAction(leadId).catch(() => {});
      }}
    >
      WhatsApp
    </a>
  );
}

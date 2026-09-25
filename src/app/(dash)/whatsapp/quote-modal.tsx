"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import QuoteEditor from "../quotes/editor";
import SendQuote from "../quotes/[id]/send";
import type { Quote } from "@/lib/types";

/**
 * Writing a quotation without leaving the conversation.
 *
 * Quoting happens mid-chat — the customer asks what it costs and waits — so
 * sending them to another page loses the thread they are answering. This is
 * the same editor the Quotations page uses, in front of the chat instead of
 * in place of it, and what it saves is an ordinary quotation: it appears
 * under Quotations and on the lead like any other.
 *
 * Saving hands straight over to sending, because that is why it was opened.
 */
export default function QuoteModal({
  conversationId,
  leadId,
  customer,
  meName,
  canSend,
}: {
  conversationId: number;
  leadId: number | null;
  customer: { name: string; email: string; phone: string };
  meName: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Quote | null>(null);

  const close = () => {
    setOpen(false);
    // A quotation written here belongs to the chat as much as to the lead.
    if (saved) router.refresh();
    setSaved(null);
  };

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>
        Quote
      </button>

      {open && (
        <div className="qt-modal" role="dialog" aria-label="Write a quotation" aria-modal="true">
          <div className="qt-modal__box">
            <div className="qt-modal__head">
              <strong>{saved ? `${saved.ref} — send it` : "New quotation"}</strong>
              <small>{customer.name || customer.phone}</small>
              <div className="spacer" />
              {saved && (
                <Link href={`/quotes/${saved.id}`} className="btn ghost sm">
                  Open it in full
                </Link>
              )}
              <button type="button" className="qt-modal__close" onClick={close} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>

            <div className="qt-modal__body">
              {saved ? (
                <>
                  <div className="msg ok">
                    Saved as <strong>{saved.ref}</strong>. It is on the Quotations page and on the
                    lead, whether or not you send it now.
                  </div>
                  <SendQuote quote={saved} meName={meName} canSend={canSend} />
                  <button type="button" className="btn ghost" onClick={close} style={{ marginTop: 12 }}>
                    Back to the chat
                  </button>
                </>
              ) : (
                <QuoteEditor
                  canEdit
                  onSaved={setSaved}
                  prefill={{
                    conversation_id: conversationId,
                    lead_id: leadId,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

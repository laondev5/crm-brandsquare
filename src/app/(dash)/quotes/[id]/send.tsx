"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Send } from "lucide-react";
import { openLeadChatAction, sendWaMessageAction, waUploadPassAction } from "@/app/actions/whatsapp";
import { setQuoteStatusAction } from "@/app/actions/quotes";
import { BUSINESS, loadLogo, quoteMessage, quotePdf } from "@/lib/quote-pdf";
import type { Quote } from "@/lib/types";

/**
 * Sending the quotation to the customer.
 *
 * The PDF is built here in the browser and posted straight to WordPress, the
 * same route every other file takes — a quotation with photographs of a line
 * would otherwise run into the size limit that route exists to avoid.
 *
 * What goes is the rep's choice each time: the document, a message with the
 * figures in it, or both. Some customers want something to print and forward;
 * some just want the number in the chat.
 */
export default function SendQuote({
  quote,
  meName,
  canSend,
}: {
  quote: Quote;
  meName: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const [attachPdf, setAttachPdf] = useState(true);
  const [asMessage, setAsMessage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const filename = `${quote.ref}-${(quote.customer_name || "quotation").replace(/[^a-z0-9]+/gi, "-")}.pdf`;

  async function build(): Promise<Blob> {
    const logo = await loadLogo();
    return quotePdf(quote, { ...BUSINESS, logo }, meName);
  }

  function download() {
    start(async () => {
      setError(null);
      const blob = await build();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function send() {
    if (!attachPdf && !asMessage) {
      setError("Choose what to send: the document, the message, or both.");
      return;
    }

    start(async () => {
      setError(null);
      setDone(null);

      // A quotation written from a lead has no chat behind it yet; opening one
      // is what the WhatsApp button on a lead does anyway.
      let conversationId = quote.conversation_id;
      if (!conversationId && quote.lead_id) {
        const opened = await openLeadChatAction(quote.lead_id);
        if ("error" in opened) {
          setError(opened.error);
          return;
        }
        conversationId = opened.conversationId;
      }
      if (!conversationId) {
        setError("There is no WhatsApp conversation to send this to. Open the chat from the lead first.");
        return;
      }

      if (attachPdf) {
        const pass = await waUploadPassAction(conversationId);
        if ("error" in pass) {
          setError(pass.error);
          return;
        }
        const form = new FormData();
        form.append("file", await build(), filename);
        form.append("ticket", pass.ticket);
        form.append("caption", `Quotation ${quote.ref}`);

        try {
          const res = await fetch(pass.url, { method: "POST", body: form });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            setError(body?.message || `The document was refused (HTTP ${res.status}).`);
            return;
          }
        } catch {
          setError("Could not reach the website to upload the document.");
          return;
        }
      }

      if (asMessage) {
        const form = new FormData();
        form.append("conversation_id", String(conversationId));
        form.append("text", quoteMessage(quote, BUSINESS.name, meName));
        const res = await sendWaMessageAction({}, form);
        if (res.error) {
          setError(res.error);
          return;
        }
      }

      const marked = await setQuoteStatusAction(quote.id, "sent");
      if ("error" in marked) {
        setError(marked.error);
        return;
      }

      setDone(
        attachPdf && asMessage
          ? "Sent — the document and the figures."
          : attachPdf
            ? "Sent as a PDF."
            : "Sent as a message."
      );
      router.refresh();
    });
  }

  return (
    <div className="card">
      <h2>Send it</h2>

      {error && <div className="msg err">{error}</div>}
      {done && (
        <div className="msg ok">
          {done}{" "}
          {quote.conversation_id && (
            <Link href={`/whatsapp?c=${quote.conversation_id}`} style={{ fontWeight: 600 }}>
              Open the chat
            </Link>
          )}
        </div>
      )}

      {canSend ? (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 10px" }}>
            Goes to{" "}
            <strong>{quote.customer_phone || quote.customer_name || "the customer"}</strong> on
            WhatsApp.
          </p>

          <label className="qt-pick">
            <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} />
            <span>
              <strong>Attach the quotation</strong>
              <small>A PDF they can keep, print or forward.</small>
            </span>
          </label>
          <label className="qt-pick">
            <input type="checkbox" checked={asMessage} onChange={(e) => setAsMessage(e.target.checked)} />
            <span>
              <strong>Put the figures in the chat</strong>
              <small>Readable on a phone without opening anything.</small>
            </span>
          </label>

          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            <button type="button" className="btn" onClick={send} disabled={busy}>
              <Send className="size-3" /> {busy ? "Sending…" : "Send on WhatsApp"}
            </button>
            <button type="button" className="btn ghost" onClick={download} disabled={busy}>
              <Download className="size-3" /> Download the PDF
            </button>
          </div>
        </>
      ) : (
        <p className="empty" style={{ margin: 0 }}>
          You do not have permission to send WhatsApp messages.{" "}
          <button type="button" className="btn ghost sm" onClick={download} disabled={busy}>
            <Download className="size-3" /> Download the PDF
          </button>
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Paperclip } from "lucide-react";
import { mailAttachmentLinkAction } from "@/app/actions/mail";
import type { MailMessage } from "@/lib/types";

function when(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function size(n: number) {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/**
 * The page a message's HTML is drawn on.
 *
 * It is a document of its own, in a frame with no scripts and no way back into
 * this page, and it carries a content policy that allows nothing from the
 * internet until the reader asks. Email from outside is untrusted by nature:
 * a picture that loads from the sender's server tells them the message was
 * opened, where, and when, so remote pictures wait for a click. The plugin has
 * already stripped scripts and event handlers; this is the second wall.
 */
function frameDoc(html: string, images: boolean) {
  const img = images ? "data: https: http:" : "data:";
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${img}; style-src 'unsafe-inline'">` +
    `<base target="_blank">` +
    `<style>html,body{margin:0;padding:0}body{display:flow-root;font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#23222b;word-wrap:break-word;overflow-wrap:anywhere}` +
    `img{max-width:100%;height:auto}a{color:#1665c1}table{max-width:100%}` +
    `blockquote{margin:0 0 0 .4em;padding-left:.9em;border-left:3px solid #dcdce6;color:#5a5866}</style>` +
    `</head><body>${html}</body></html>`
  );
}

function Body({ message }: { message: MailMessage }) {
  const [images, setImages] = useState(false);
  const [height, setHeight] = useState(80);
  const frame = useRef<HTMLIFrameElement>(null);
  const watcher = useRef<ResizeObserver | null>(null);

  const hasRemote = useMemo(() => /<img\b[^>]*\bsrc\s*=\s*["']?https?:/i.test(message.html), [message.html]);
  const doc = useMemo(() => frameDoc(message.html, images), [message.html, images]);

  useEffect(() => () => watcher.current?.disconnect(), []);

  // The frame is as tall as what is in it, so the page scrolls rather than the frame.
  const fit = () => {
    const d = frame.current?.contentDocument;
    if (!d?.body) return;
    // The body's own height, not the document's: the document is never shorter
    // than the frame, so measuring it could only ever make the frame taller.
    const measure = () => setHeight(Math.max(24, Math.ceil(d.body.getBoundingClientRect().height)));
    measure();
    watcher.current?.disconnect();
    watcher.current = new ResizeObserver(measure);
    watcher.current.observe(d.body);
  };

  if (!message.html.trim()) {
    return <pre className="mail-text">{message.text || "(no text)"}</pre>;
  }

  return (
    <>
      {hasRemote && !images && (
        <p className="mail-images">
          <ImageOff className="size-3" aria-hidden="true" /> Pictures from the internet are hidden.{" "}
          <button type="button" className="mail-link" onClick={() => setImages(true)}>
            Show pictures
          </button>
        </p>
      )}
      <iframe
        ref={frame}
        title={`Message from ${message.from_name || message.from_email}`}
        srcDoc={doc}
        // Same-origin is what lets this page measure the frame. It is safe here
        // only because scripts are not allowed: with both, a frame could lift
        // its own sandbox.
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={fit}
        style={{ width: "100%", height, border: 0, display: "block" }}
      />
    </>
  );
}

export default function MessageCard({ message, defaultOpen }: { message: MailMessage; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [err, setErr] = useState("");
  const mine = message.direction === "out";
  const files = message.attachments.filter((a) => !a.inline);

  async function download(id: number) {
    setErr("");
    const res = await mailAttachmentLinkAction(id);
    if ("error" in res) setErr(res.error);
    else window.location.assign(res.url);
  }

  return (
    <article className={`mail-msg${mine ? " is-out" : ""}${message.is_unread ? " is-unread" : ""}`}>
      <header className="mail-msg__head" onClick={() => setOpen((o) => !o)}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{mine ? message.actor_name || "Company mailbox" : message.from_name || message.from_email}</strong>
          {!open && <small className="mail-msg__peek"> — {(message.text || "").replace(/\s+/g, " ").slice(0, 120)}</small>}
          {open && (
            <small style={{ display: "block", color: "var(--muted)" }}>
              {mine ? "" : `${message.from_email} · `}to {message.to.map((p) => p.name || p.email).join(", ") || "—"}
              {message.cc.length > 0 && <> · cc {message.cc.map((p) => p.name || p.email).join(", ")}</>}
            </small>
          )}
        </div>
        <small style={{ color: "var(--muted)", flexShrink: 0 }}>
          {files.length > 0 && <Paperclip className="size-3" aria-label="Has attachments" style={{ marginRight: 4 }} />}
          {when(message.sent_at)}
        </small>
      </header>

      {open && (
        <div className="mail-msg__body">
          <Body message={message} />
          {files.length > 0 && (
            <ul className="mail-files" style={{ marginTop: 10 }}>
              {files.map((a) => (
                <li key={a.id}>
                  <Paperclip className="size-3" aria-hidden="true" />{" "}
                  <button type="button" className="mail-link" onClick={() => download(a.id)}>
                    {a.filename || "attachment"}
                  </button>{" "}
                  <small>{size(a.size)}</small>
                </li>
              ))}
            </ul>
          )}
          {err && (
            <p role="alert" style={{ color: "var(--err)", fontSize: 12, margin: "6px 0 0" }}>
              {err}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

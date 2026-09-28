"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Clock, FileText, ImageOff, Pencil, Trash2, XCircle } from "lucide-react";
import { editWaMessageAction, deleteWaMessageAction } from "@/app/actions/whatsapp";
import type { WaMessage } from "@/lib/types";

function StatusIcon({ status }: { status: WaMessage["status"] }) {
  switch (status) {
    case "sending":
      return <Clock className="size-3" style={{ color: "#9aa" }} />;
    case "sent":
      return <Check className="size-3" style={{ color: "#9aa" }} />;
    case "delivered":
      return <CheckCheck className="size-3" style={{ color: "#9aa" }} />;
    case "read":
      return <CheckCheck className="size-3" style={{ color: "#34a5e0" }} />;
    case "failed":
      return <XCircle className="size-3" style={{ color: "var(--err)" }} />;
    default:
      return null;
  }
}

/**
 * Fetches a message's media through the CRM's own proxy rather than pointing
 * an <img> straight at anything Meta-hosted — the browser holds no WhatsApp
 * token, so a direct URL would just 401. Loaded once per bubble and kept as
 * an object URL for the life of the page.
 */
function useMedia(messageId: number, enabled: boolean) {
  const [state, setState] = useState<{ url: string | null; error: boolean; loading: boolean }>({
    url: null,
    error: false,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    let revoke: string | null = null;
    let cancelled = false;

    fetch(`/api/whatsapp/media/${messageId}`)
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoke = url;
        setState({ url, error: false, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, error: true, loading: false });
      });

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, enabled]);

  return state;
}

function MediaBlock({ message }: { message: WaMessage }) {
  const isImage = message.type === "image";
  const isVideo = message.type === "video";
  const isAudio = message.type === "audio";
  const { url, error, loading } = useMedia(message.id, message.has_media);

  if (loading) {
    return (
      <div style={{ padding: "18px 22px", fontSize: 12, color: "var(--muted)" }}>Loading…</div>
    );
  }
  if (error || !url) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 12px",
          background: "rgba(0,0,0,.06)",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <ImageOff className="size-4" /> Media unavailable
      </div>
    );
  }

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a blob: URL, next/image cannot optimise it
      <img src={url} alt="" style={{ maxWidth: 280, borderRadius: 8, display: "block" }} />
    );
  }
  if (isVideo) {
    return <video src={url} controls style={{ maxWidth: 280, borderRadius: 8, display: "block" }} />;
  }
  if (isAudio) {
    return <audio src={url} controls style={{ maxWidth: 260 }} />;
  }
  return (
    <a
      href={url}
      download={message.media_filename || "file"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        background: "rgba(0,0,0,.05)",
        borderRadius: 8,
        fontSize: 13,
        color: "var(--ink)",
        textDecoration: "none",
      }}
    >
      <FileText className="size-4" /> {message.media_filename || "Download file"}
    </a>
  );
}

function clock(iso: string) {
  const time = new Date(iso.replace(" ", "T"));
  return isNaN(time.getTime()) ? "" : time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * One message. Sent messages that are plain typed text can be edited by
 * anyone with WhatsApp access; any message can be removed the same way — the
 * bar for both is having WhatsApp access at all, the same as sending.
 *
 * Neither reaches Meta. There is no way to change or unsend a message once
 * WhatsApp has delivered it, so both are corrections to this CRM's own
 * record: the customer's phone keeps showing exactly what was sent.
 */
export default function MessageBubble({
  message,
  canManage = false,
}: {
  message: WaMessage;
  canManage?: boolean;
}) {
  const router = useRouter();
  const out = message.direction === "out";
  const tpl = message.template;
  const timeLabel = clock(message.created_at);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.body ?? "");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      area.current?.focus();
      area.current?.setSelectionRange(text.length, text.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // A plain typed reply this business sent, still there to edit. Everything
  // else — the customer's own messages, media, templates — is read-only here.
  const canEdit = canManage && out && message.type === "text" && !tpl && !message.deleted;
  const canDelete = canManage && !message.deleted;

  function save() {
    const next = text.trim();
    if (!next || next === message.body) {
      setEditing(false);
      setText(message.body ?? "");
      return;
    }
    start(async () => {
      setError(null);
      const res = await editWaMessageAction(message.id, next);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      setError(null);
      const res = await deleteWaMessageAction(message.id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (message.deleted) {
    return (
      <div style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start", padding: "3px 14px" }}>
        <div className="wa-tomb">
          <Trash2 className="size-3" aria-hidden="true" />
          Message deleted{message.deleted_by_name ? ` by ${message.deleted_by_name}` : ""}
        </div>
      </div>
    );
  }

  return (
    <div
      className="wa-bubble-row"
      style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start", padding: "3px 14px" }}
    >
      <div
        className="wa-bubble"
        style={{
          maxWidth: "70%",
          background: out ? "#dcf8c6" : "#fff",
          border: out ? "none" : "1px solid var(--line)",
          borderRadius: 10,
          padding: message.has_media && !editing ? 6 : "8px 10px",
          boxShadow: "0 1px 1px rgba(0,0,0,.05)",
          position: "relative",
        }}
      >
        {(canEdit || canDelete) && !editing && !confirming && (
          <div className="wa-bubble__tools">
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} title="Edit this message" aria-label="Edit">
                <Pencil className="size-3" />
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={() => setConfirming(true)} title="Delete this message" aria-label="Delete">
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        )}

        {message.has_media && !editing && <MediaBlock message={message} />}

        {/* A template carries more than its text: the header the customer
            saw goes above it, the footer and buttons below. */}
        {tpl?.header_type === "image" && tpl.header_image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- a WordPress media URL
          <img
            src={tpl.header_image_url}
            alt=""
            style={{ maxWidth: 280, width: "100%", borderRadius: 8, display: "block", marginBottom: 6 }}
          />
        )}
        {tpl?.header_type === "text" && tpl.header_text && (
          <strong style={{ display: "block", fontSize: 14, marginBottom: 4 }}>{tpl.header_text}</strong>
        )}

        {editing ? (
          <div className="wa-edit">
            <textarea
              ref={area}
              value={text}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  save();
                } else if (e.key === "Escape") {
                  setEditing(false);
                  setText(message.body ?? "");
                }
              }}
            />
            <div className="wa-edit__row">
              <button type="button" className="btn sm" onClick={save} disabled={pending || !text.trim()}>
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  setEditing(false);
                  setText(message.body ?? "");
                  setError(null);
                }}
                disabled={pending}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          message.body && (
            <p style={{ margin: message.has_media ? "6px 4px 2px" : 0, fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {message.body}
            </p>
          )
        )}

        {tpl?.footer && (
          <small style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--muted)" }}>{tpl.footer}</small>
        )}
        {tpl?.buttons && tpl.buttons.length > 0 && (
          <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
            {tpl.buttons.map((b, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,.75)",
                  borderRadius: 6,
                  padding: "5px 8px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "#0086c9",
                }}
              >
                {b}
              </div>
            ))}
          </div>
        )}

        {!editing && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              justifyContent: "flex-end",
              marginTop: 3,
            }}
          >
            {out && message.actor_name && (
              <small style={{ fontSize: 10, color: "var(--muted)", marginRight: "auto" }}>
                {message.actor_name}
                {tpl?.template ? ` · template: ${tpl.template}` : ""}
              </small>
            )}
            {message.edited_at && (
              <small style={{ fontSize: 10, color: "var(--muted)" }} title={`Edited by ${message.edited_by_name || "someone"}`}>
                edited
              </small>
            )}
            <small style={{ fontSize: 10, color: "var(--muted)" }}>{timeLabel}</small>
            {out && <StatusIcon status={message.status} />}
          </div>
        )}

        {message.status === "failed" && message.error_message && (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--err)" }}>{message.error_message}</p>
        )}

        {error && <p className="wa-bubble__err">{error}</p>}

        {confirming && (
          <div className="wa-bubble__confirm">
            <p>Delete this message? It comes off the thread here — WhatsApp has no way to unsend it on their phone.</p>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn sm"
                style={{ background: "var(--err)", borderColor: "var(--err)" }}
                onClick={remove}
                disabled={pending}
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setConfirming(false)} disabled={pending}>
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

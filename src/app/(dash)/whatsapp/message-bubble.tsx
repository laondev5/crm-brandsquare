"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck, Clock, FileText, ImageOff, XCircle } from "lucide-react";
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

export default function MessageBubble({ message }: { message: WaMessage }) {
  const out = message.direction === "out";
  const time = new Date(message.created_at.replace(" ", "T"));
  const timeLabel = isNaN(time.getTime())
    ? ""
    : time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start", padding: "3px 14px" }}>
      <div
        style={{
          maxWidth: "70%",
          background: out ? "#dcf8c6" : "#fff",
          border: out ? "none" : "1px solid var(--line)",
          borderRadius: 10,
          padding: message.has_media ? 6 : "8px 10px",
          boxShadow: "0 1px 1px rgba(0,0,0,.05)",
        }}
      >
        {message.has_media && <MediaBlock message={message} />}

        {message.body && (
          <p style={{ margin: message.has_media ? "6px 4px 2px" : 0, fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {message.body}
          </p>
        )}

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
            <small style={{ fontSize: 10, color: "var(--muted)", marginRight: "auto" }}>{message.actor_name}</small>
          )}
          <small style={{ fontSize: 10, color: "var(--muted)" }}>{timeLabel}</small>
          {out && <StatusIcon status={message.status} />}
        </div>

        {message.status === "failed" && message.error_message && (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--err)" }}>{message.error_message}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Mic, Paperclip, Square, X } from "lucide-react";
import { sendWaMediaAction, waUploadPassAction } from "@/app/actions/whatsapp";
import { needsRepackaging, webmOpusToOgg } from "@/lib/ogg-opus";
import { WA_ACCEPT, prettyBytes, waMediaKind, waMediaProblem } from "@/lib/types";

/** What Vercel will carry in a request body. Anything above this never reaches
 *  the dashboard's own code, so it cannot be sent that way at all. */
const THROUGH_DASHBOARD_MAX = 4 * 1024 * 1024;

/** A voice note has to stop somewhere, and five minutes is already far longer
 *  than anyone speaks into a chat. */
const MAX_SECONDS = 300;

/** The recording formats WhatsApp accepts, best first. Firefox gives Ogg and
 *  Safari gives MP4, both of which go as they are; Chrome and Edge only offer
 *  WebM, which is the same Opus audio in a container WhatsApp refuses, so the
 *  server repackages it on the way out. */
const RECORDING_TYPES = ["audio/ogg;codecs=opus", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

function bestRecordingType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of RECORDING_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // Older browsers throw rather than answering; the next one is tried.
    }
  }
  return "";
}

function extensionFor(mime: string) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  return "webm";
}

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Sending a file: the two buttons that live beside the message box, and the
 * pane that covers the chat once something is staged.
 *
 * The pane exists because a file is worth looking at before it goes to a
 * customer — the wrong photo of the wrong machine is a phone call to undo. So
 * the picture is shown full width, the document is named, and the recording can
 * be played back, all with a Send button that has to be pressed.
 */
export default function Attachments({ conversationId }: { conversationId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const kind = file ? waMediaKind({ type: file.type, name: file.name }) : null;

  // One object URL per staged file, released as soon as it is replaced —
  // a recorded video left behind would hold on to real memory.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Stop the microphone if this conversation is closed mid-recording; the
  // browser would otherwise keep the recording light on.
  useEffect(
    () => () => {
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, seconds]);

  function stage(picked: File) {
    const problem = waMediaProblem({ type: picked.type, name: picked.name, size: picked.size });
    setError(problem);
    setFile(problem ? null : picked);
    setCaption("");
  }

  function clear() {
    setFile(null);
    setCaption("");
    setError(null);
    if (input.current) input.current.value = "";
  }

  async function startRecording() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser will not record audio. Attach an audio file instead.");
      return;
    }
    let stream: MediaStream;
    try {
      // One channel, 48 kHz: what a WhatsApp voice note is. Asking for it
      // here means the recording does not have to be converted later, and
      // takes a stereo microphone out of the picture as a thing that could
      // make WhatsApp refuse the file.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 48000, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setError("The browser would not give access to the microphone. Allow it and try again.");
      return;
    }

    const type = bestRecordingType();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError("This browser will not record audio. Attach an audio file instead.");
      return;
    }

    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const mime = (rec.mimeType || type || "audio/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type: mime });
      setRecording(false);
      if (blob.size === 0) {
        setError("Nothing was recorded. Try again.");
        return;
      }
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      stage(new File([blob], `voice-note-${stamp}.${extensionFor(mime)}`, { type: mime }));
    };

    recorder.current = rec;
    setSeconds(0);
    setRecording(true);
    rec.start();
  }

  function stopRecording() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    else setRecording(false);
  }

  function cancelRecording() {
    const rec = recorder.current;
    chunks.current = [];
    if (rec) {
      rec.onstop = () => rec.stream.getTracks().forEach((t) => t.stop());
      if (rec.state !== "inactive") rec.stop();
    }
    setRecording(false);
    setSeconds(0);
  }

  /**
   * Sends the staged file to WordPress directly, and only asks the dashboard
   * for permission to do so.
   *
   * A recording is repackaged here rather than on the server, because with the
   * file going straight to WordPress the server never sees it. The dashboard
   * stays as a fallback for anything small enough to fit through it, so a
   * problem with the direct route costs the large files, not every file.
   */
  function send() {
    if (!file) return;

    startSending(async () => {
      setError(null);

      let out = file;
      if (needsRepackaging(file.type) || /\.webm$/i.test(file.name)) {
        try {
          const ogg = webmOpusToOgg(new Uint8Array(await file.arrayBuffer()));
          out = new File([ogg], file.name.replace(/\.[^.]+$/, "") + ".ogg", { type: "audio/ogg" });
        } catch {
          setError("That recording could not be prepared for WhatsApp. Record it again, or attach an audio file instead.");
          return;
        }
      }

      const pass = await waUploadPassAction(conversationId);
      if ("error" in pass) {
        setError(pass.error);
        return;
      }

      const form = new FormData();
      form.append("file", out, out.name);
      form.append("ticket", pass.ticket);
      if (caption.trim()) form.append("caption", caption.trim());

      let direct = "";
      try {
        const res = await fetch(pass.url, { method: "POST", body: form });
        if (res.ok) {
          clear();
          router.refresh();
          return;
        }
        const body = await res.json().catch(() => null);
        direct = body?.message || `The file was refused (HTTP ${res.status}).`;
      } catch {
        direct = "Could not reach the website to upload the file.";
      }

      // Small enough to fit through the dashboard: worth one more try, since
      // that route is the one that has always worked.
      if (out.size > THROUGH_DASHBOARD_MAX) {
        setError(direct);
        return;
      }

      const relay = new FormData();
      relay.append("conversation_id", String(conversationId));
      relay.append("file", out, out.name);
      if (caption.trim()) relay.append("caption", caption.trim());

      const res = await sendWaMediaAction({}, relay);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      clear();
      router.refresh();
    });
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={WA_ACCEPT}
        hidden
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) stage(picked);
        }}
      />

      {recording ? (
        <div className="wa-rec" role="status">
          <span className="wa-rec__dot" aria-hidden="true" />
          <span className="wa-rec__time">{clock(seconds)}</span>
          <button type="button" className="btn sm" onClick={stopRecording} title="Finish recording">
            <Square className="size-3" /> Stop
          </button>
          <button type="button" className="btn ghost sm" onClick={cancelRecording}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn ghost wa-icon-btn"
            onClick={() => input.current?.click()}
            title="Attach a photo, video or document"
            aria-label="Attach a file"
            disabled={sending}
          >
            <Paperclip className="size-4" />
          </button>
          <button
            type="button"
            className="btn ghost wa-icon-btn"
            onClick={startRecording}
            title="Record a voice note"
            aria-label="Record a voice note"
            disabled={sending}
          >
            <Mic className="size-4" />
          </button>
        </>
      )}

      {error && !file && (
        <p className="wa-attach-err" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      {file && (
        <div className="wa-stage" role="dialog" aria-label="Send a file">
          <div className="wa-stage__head">
            <strong>
              {kind === "audio" ? "Voice note" : kind === "image" ? "Photo" : kind === "video" ? "Video" : "Document"}
            </strong>
            <div className="spacer" />
            <button type="button" className="wa-stage__close" onClick={clear} aria-label="Cancel">
              <X className="size-4" />
            </button>
          </div>

          <div className="wa-stage__body">
            {error && <div className="msg err">{error}</div>}

            {kind === "image" && preview && (
              // eslint-disable-next-line @next/next/no-img-element -- a blob: URL, next/image cannot optimise it
              <img src={preview} alt="" className="wa-stage__img" />
            )}
            {kind === "video" && preview && <video src={preview} controls className="wa-stage__img" />}
            {kind === "audio" && preview && <audio src={preview} controls className="wa-stage__audio" />}
            {kind === "document" && (
              <p className="wa-stage__doc">
                <FileText className="size-5" />
                <span>{file.name}</span>
              </p>
            )}

            <small className="wa-stage__meta">
              {file.name} · {prettyBytes(file.size)}
            </small>

            <label className="f">
              <span>{kind === "audio" ? "Say something with it (optional)" : "Caption (optional)"}</span>
              <textarea
                rows={2}
                value={caption}
                placeholder={kind === "audio" ? "Goes as a message of its own" : "Typed under the file in WhatsApp"}
                onChange={(e) => setCaption(e.target.value)}
              />
              {kind === "audio" && (
                <small style={{ color: "var(--muted)", fontSize: 11.5 }}>
                  WhatsApp puts no caption on a voice note, so this follows as a separate message.
                </small>
              )}
            </label>
          </div>

          <div className="wa-stage__foot">
            <button type="button" className="btn" onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </button>
            <button type="button" className="btn ghost" onClick={clear} disabled={sending}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { Archive, Download, HardDriveDownload } from "lucide-react";
import { waBackupBatchAction, waBackupLinkAction } from "@/app/actions/whatsapp";
import type { WaBackupStatus } from "@/lib/types";

/**
 * Keeps the WhatsApp history safe whatever happens to the Meta account.
 *
 * The words of every conversation are already stored here. Photos, voice notes
 * and documents are a different matter: for a customer's message, Meta holds
 * the file for only about a month, and it is lost for good once the account is
 * detached. So the first job is to copy the ones still on Meta onto this site,
 * a few at a time (a thousand in one request would outrun the host), and the
 * second is to download the whole lot -- text, files and a readme -- as one
 * archive that can be kept anywhere.
 */
export default function Backup({ status }: { status: WaBackupStatus }) {
  const [live, setLive] = useState(status);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);
  const stop = useRef(false);

  const pending = live.media_pending;

  async function saveFiles() {
    stop.current = false;
    setRunning(true);
    setNote(null);

    let saved = 0;
    let lost = 0;
    let remaining = pending;
    try {
      // Each call does a handful and says how many are left; carry on until
      // none are, or until something other than a missing file stops it.
      for (let guard = 0; guard < 2000 && !stop.current; guard++) {
        const res = await waBackupBatchAction();
        if ("error" in res) {
          setNote({ kind: "err", text: res.error });
          return;
        }
        saved += res.saved;
        lost += res.lost;
        remaining = res.remaining;
        setLive((s) => ({
          ...s,
          media_saved: s.media_saved + res.saved,
          media_failed: s.media_failed + res.lost,
          media_pending: res.remaining,
        }));
        if (res.stopped) {
          setNote({ kind: "err", text: `Stopped: ${res.stopped} ${saved} saved so far; run it again to carry on.` });
          return;
        }
        if (res.remaining === 0) break;
        // A pass that achieved nothing and is not finished would loop forever.
        if (res.saved === 0 && res.lost === 0) {
          setNote({ kind: "warn", text: "No more files could be fetched just now. Try again in a minute." });
          return;
        }
      }
      setNote(
        stop.current
          ? { kind: "warn", text: `Paused. ${saved} saved this time, ${remaining} still to go.` }
          : {
              kind: "ok",
              text:
                `${saved} file${saved === 1 ? "" : "s"} saved on this site.` +
                (lost ? ` ${lost} no longer exist on Meta, so they could not be kept.` : ""),
            }
      );
    } finally {
      setRunning(false);
    }
  }

  async function download() {
    setNote(null);
    const res = await waBackupLinkAction();
    if ("error" in res) {
      setNote({ kind: "err", text: res.error });
      return;
    }
    // WordPress builds the archive and sends it straight to the browser.
    window.location.assign(res.url);
    setNote({
      kind: "ok",
      text: "Preparing the archive. A large history can take a minute before the download starts.",
    });
  }

  return (
    <div className="card">
      <h2>
        <Archive className="size-4" aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Backup
      </h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0, lineHeight: 1.55 }}>
        Every conversation stays in the CRM even after the Meta account is detached. Do these two things before you do
        it, so the photos and voice notes are safe too, and so you hold a copy of your own.
      </p>

      {note && <div className={`msg ${note.kind === "warn" ? "warn" : note.kind}`}>{note.text}</div>}

      <dl className="qt-summary" style={{ marginBottom: 14 }}>
        <div>
          <dt>Conversations</dt>
          <dd>{live.conversations.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Messages</dt>
          <dd>{live.messages.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Files kept on this site</dt>
          <dd>
            {live.media_saved.toLocaleString()} of {live.media_total.toLocaleString()}
          </dd>
        </div>
        {pending > 0 && (
          <div>
            <dt>Still only on Meta</dt>
            <dd style={{ color: "#8a5a00" }}>{pending.toLocaleString()}</dd>
          </div>
        )}
        {live.media_failed > 0 && (
          <div>
            <dt>No longer on Meta</dt>
            <dd style={{ color: "var(--muted)" }}>{live.media_failed.toLocaleString()}</dd>
          </div>
        )}
      </dl>

      {pending > 0 && !live.configured && (
        <div className="msg warn">
          {pending.toLocaleString()} file{pending === 1 ? " is" : "s are"} still only on Meta, and no WhatsApp connection
          is saved to fetch them with. Those can no longer be rescued.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {pending > 0 && live.configured && (
          <>
            <button type="button" className="btn" onClick={saveFiles} disabled={running}>
              <HardDriveDownload className="size-3" />{" "}
              {running ? "Saving files…" : `Save ${pending.toLocaleString()} files on this site now`}
            </button>
            {running && (
              <button type="button" className="btn ghost" onClick={() => (stop.current = true)}>
                Pause
              </button>
            )}
          </>
        )}
        <button type="button" className="btn ghost" onClick={download} disabled={running || !live.zip}>
          <Download className="size-3" /> Download full backup
        </button>
      </div>

      {!live.zip && (
        <p style={{ fontSize: 12, color: "var(--err)", margin: "10px 0 0" }}>
          This hosting has no zip support, so the archive cannot be built. Ask the host to enable PHP&rsquo;s zip
          extension.
        </p>
      )}

      {pending === 0 && live.media_total > 0 && (
        <p style={{ fontSize: 12, color: "#0f6e56", margin: "10px 0 0" }}>Every available file is safe on this site.</p>
      )}

      {live.last_backup && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0" }}>
          Last downloaded {live.last_backup.at.slice(0, 16).replace("T", " ")}
          {live.last_backup.by ? ` by ${live.last_backup.by}` : ""} — {live.last_backup.conversations} conversations,{" "}
          {live.last_backup.messages} messages, {live.last_backup.files} files.
        </p>
      )}

      <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.55 }}>
        WhatsApp does not let a past conversation be loaded into the app on a phone, so it cannot be moved across. The
        archive and the read-only inbox are how it is kept.
      </p>
    </div>
  );
}

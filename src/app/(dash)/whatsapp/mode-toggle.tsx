"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWaModeAction } from "@/app/actions/whatsapp";

/**
 * "Internal": is the team working WhatsApp in this inbox, or on the phone?
 *
 * On, the inbox sends and receives as it always has. Off, the business has
 * moved to the ordinary WhatsApp Business app: every WhatsApp button in the
 * CRM opens that app on the lead's chat, and this page keeps what was said
 * before as a read-only archive.
 *
 * Only the people who hold the WhatsApp connection can flip it, because it
 * changes the working day of the whole team; everyone else sees which way it is
 * set. Turning it off asks first and says what changes, since that is the
 * direction that takes the reply box away from people mid-conversation.
 */
export default function ModeToggle({
  internal,
  canSwitch,
  hasNumber,
}: {
  internal: boolean;
  canSwitch: boolean;
  /** The WhatsApp number the team will use on the phone has been saved. */
  hasNumber: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const change = (next: boolean) =>
    start(async () => {
      setError(null);
      const res = await setWaModeAction(next);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setAsking(false);
      router.refresh();
    });

  const label = (
    <>
      <span className="wa-switch__label">Internal</span>
      <span className={`pill ${internal ? "s-active" : "s-disabled"}`}>{internal ? "In the CRM" : "On the phone"}</span>
    </>
  );

  if (!canSwitch) {
    return (
      <span className="wa-switch" title="Only a super admin or the IT officer can change this">
        {label}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="wa-switch wa-switch--btn"
        role="switch"
        aria-checked={internal}
        aria-label="Use the WhatsApp inbox inside the CRM"
        disabled={busy}
        onClick={() => (internal ? setAsking(true) : change(true))}
      >
        <span className={`wa-switch__track${internal ? " is-on" : ""}`} aria-hidden="true">
          <span className="wa-switch__knob" />
        </span>
        {label}
      </button>
      {error && !asking && (
        <span role="alert" style={{ color: "var(--err)", fontSize: 12 }}>
          {error}
        </span>
      )}

      {asking && (
        <div className="wa-confirm" role="alertdialog" aria-label="Move WhatsApp to the phone">
          <div className="wa-confirm__box">
            <strong>Move WhatsApp to the phone?</strong>
            <p>
              The WhatsApp button on every lead will open WhatsApp itself, on a chat with that lead and a greeting
              ready to send. This inbox stops sending and becomes a read-only archive of everything said so far.
              You can switch it back on at any time.
            </p>
            {!hasNumber && (
              <p style={{ color: "#854f0b" }}>
                No WhatsApp number is saved yet. Buttons will still open the lead&rsquo;s chat, but add your number
                under WhatsApp settings so it is on record.
              </p>
            )}
            {error && <div className="msg err">{error}</div>}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" onClick={() => change(false)} disabled={busy}>
                {busy ? "Switching…" : "Switch it off"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setAsking(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

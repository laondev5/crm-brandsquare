"use client";

import { useEffect, useState } from "react";
import type { PersonName } from "@/lib/types";
import MeetingForm from "./meeting-form";

/** The scheduling form, folded away until wanted, plus the desktop-alert switch. */
export default function SchedulePanel({
  people,
  meId,
  openAtStart = false,
  google,
  canSetup = false,
}: {
  people: PersonName[];
  meId: number;
  openAtStart?: boolean;
  google?: { connected: boolean; account: string };
  canSetup?: boolean;
}) {
  const [open, setOpen] = useState(openAtStart);
  const [perm, setPerm] = useState<string>("unsupported");

  useEffect(() => {
    try {
      if (typeof Notification !== "undefined") setPerm(Notification.permission);
    } catch {
      // Not available here; the in-page cards still work.
    }
  }, []);

  const allow = async () => {
    try {
      setPerm(await Notification.requestPermission());
    } catch {
      // Refused or unsupported.
    }
  };

  return (
    <>
      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {!open && (
          <button className="btn" onClick={() => setOpen(true)}>
            + Schedule a meeting
          </button>
        )}
        {perm === "default" && (
          <button className="btn ghost" onClick={allow} title="Get the 10-minute reminder as a desktop pop-up, even when the CRM is in another tab">
            Turn on desktop reminders
          </button>
        )}
        {perm === "granted" && <span className="board-legend">Desktop reminders are on</span>}
        {perm === "denied" && (
          <span className="board-legend">Desktop reminders are blocked in this browser&rsquo;s site settings</span>
        )}
      </div>
      {open && (
        <div className="card" style={{ maxWidth: 760, marginBottom: 20 }}>
          <h2>Schedule a meeting</h2>
          <MeetingForm people={people} meId={meId} google={google} canSetup={canSetup} onDone={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

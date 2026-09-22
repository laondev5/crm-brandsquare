"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMeetingAction } from "@/app/actions/meetings";
import { googleCalendarLink, type Meeting, type PersonName } from "@/lib/types";
import MeetingForm from "./meeting-form";

function time(s: string) {
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? s : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** One meeting: when, who, the link, and what the viewer can do with it. */
export default function MeetingCard({
  m,
  people,
  meId,
  past = false,
  google,
}: {
  m: Meeting;
  people: PersonName[];
  meId: number;
  past?: boolean;
  google?: { connected: boolean; account: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const cancelled = m.status === "cancelled";
  const live = !past && !cancelled && m.starts_in_min <= 10;
  const running = m.starts_in_min <= 0;

  if (editing) {
    return (
      <div className="card mtg-card">
        <h2 style={{ marginBottom: 12 }}>Change meeting</h2>
        <MeetingForm people={people} meId={meId} meeting={m} google={google} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const cancel = () => {
    if (!confirm(`Cancel "${m.title}"? Everyone in it will be emailed.`)) return;
    setErr("");
    start(async () => {
      const res = await cancelMeetingAction(m.id);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  return (
    <div className={`card mtg-card${live ? " is-live" : ""}${cancelled ? " is-cancelled" : ""}`}>
      <div className="mtg-card__time">
        <b>{time(m.start_at)}</b>
        <span>{m.duration_min} min</span>
      </div>
      <div className="mtg-card__body">
        <div className="mtg-card__head">
          <strong>{m.title}</strong>
          {cancelled && <span className="pill s-disabled">Cancelled</span>}
          {live && <span className="pill s-active">{running ? "Happening now" : `Starts in ${m.starts_in_min} min`}</span>}
          {m.unseen && !cancelled && <span className="pill" style={{ background: "#fff3e9", color: "var(--pd)" }}>New</span>}
        </div>
        <div className="mtg-card__meta">
          Organised by {m.is_organizer ? "you" : m.organizer_name} · until {time(m.end_at)}
        </div>
        {m.agenda && <p className="mtg-card__agenda">{m.agenda}</p>}
        <div className="mtg-card__people">
          {m.people.map((p) => (
            <span key={p.id} className={`mtg-chip${p.id === m.created_by ? " is-org" : ""}`} title={p.id === m.created_by ? "Organiser" : undefined}>
              {p.name}
              {p.id === meId ? " (you)" : ""}
            </span>
          ))}
        </div>
        {err && <div className="msg err">{err}</div>}
      </div>
      {!cancelled && !past && (
        <div className="mtg-card__actions">
          <a className={`btn${live ? "" : " ghost"} mtg-join`} href={m.meet_url} target="_blank" rel="noopener noreferrer">
            Join Google Meet
          </a>
          {m.on_google ? (
            <span className="board-legend" title="Google sent the invite, so it is already in everyone's calendar">In Google Calendar</span>
          ) : (
            <a className="btn ghost sm" href={googleCalendarLink(m)} target="_blank" rel="noopener noreferrer">
              Add to Google Calendar
            </a>
          )}
          {m.can_edit && (
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn ghost sm" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="btn ghost sm" disabled={busy} onClick={cancel} style={{ color: "var(--err)" }}>
                {busy ? "Cancelling…" : "Cancel meeting"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

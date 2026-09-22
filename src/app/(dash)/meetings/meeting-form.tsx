"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMeetingAction } from "@/app/actions/meetings";
import { ROLE_LABEL, type Meeting, type PersonName } from "@/lib/types";

const DURATIONS = [15, 30, 45, 60, 90, 120];

/** The next half hour, as the value a datetime-local box wants. */
function nextSlot() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Schedule or change a meeting.
 *
 * Google does not let another site create Meet rooms without a Google Cloud
 * project, so the link is made in one click on Google's side ("Create a Meet
 * link" opens meet.google.com/new) and pasted back here.
 */
export default function MeetingForm({
  people,
  meId,
  meeting,
  onDone,
  google,
  canSetup = false,
}: {
  people: PersonName[];
  meId: number;
  meeting?: Meeting;
  onDone?: () => void;
  /** With a Google account connected, the room is made by the Google API. */
  google?: { connected: boolean; account: string };
  /** Super admin / IT: can connect Google from Meeting settings. */
  canSetup?: boolean;
}) {
  const auto = !!google?.connected;
  // With Google connected the link box is not needed at all; it only opens
  // for someone who deliberately wants a different room.
  const [ownLink, setOwnLink] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState(saveMeetingAction, null);
  const [picked, setPicked] = useState<number[]>(
    meeting ? meeting.people.map((p) => p.id).filter((id) => id !== meeting.created_by) : []
  );
  const [q, setQ] = useState("");
  const [url, setUrl] = useState(meeting?.meet_url ?? "");

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.refresh();
      if (meeting) onDone?.();
      else {
        // Ready for the next one.
        setPicked([]);
        setUrl("");
        setOwnLink(false);
      }
    }
  }, [state, meeting, onDone, router]);

  const others = useMemo(
    () => people.filter((p) => p.id !== (meeting?.created_by ?? meId)),
    [people, meeting, meId]
  );
  const shown = others.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: number) => setPicked((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));
  const looksLikeMeet = !url || /meet\.google\.com\//i.test(url);
  const done = state && "ok" in state && state.ok && !meeting;

  return (
    <form action={action} className="mtg-form" key={done ? "reset" : "form"}>
      {meeting && <input type="hidden" name="id" value={meeting.id} />}
      {state && "error" in state && <div className="msg err">{state.error}</div>}
      {done && <div className="msg ok">{state.ok}</div>}

      <label className="f">
        <span>Title</span>
        <input type="text" name="title" required defaultValue={meeting?.title} placeholder="Weekly sales review" />
      </label>

      <div className="mtg-form__row">
        <label className="f">
          <span>Date and time</span>
          <input
            type="datetime-local"
            name="start_at"
            required
            defaultValue={meeting ? meeting.start_at.slice(0, 16).replace(" ", "T") : nextSlot()}
          />
        </label>
        <label className="f">
          <span>How long</span>
          <select name="duration_min" defaultValue={meeting?.duration_min ?? 30}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d < 60 ? `${d} minutes` : `${d / 60} hour${d === 60 ? "" : "s"}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="f">
        <span>Google Meet</span>
        {auto && !ownLink ? (
          <div className="mtg-auto">
            <span className="mtg-auto__icon" aria-hidden="true">🎥</span>
            <div style={{ flex: 1 }}>
              <b>{meeting ? "Keeps its Google Meet room" : "A Google Meet room is created for this meeting"}</b>
              <small>
                {meeting
                  ? meeting.meet_url
                  : `Made by ${google?.account || "the connected Google account"} when you save, and added to everyone's Google Calendar.`}
              </small>
            </div>
            <button type="button" className="btn ghost sm" onClick={() => setOwnLink(true)}>
              Use a different link
            </button>
            <input type="hidden" name="meet_url" value={meeting ? meeting.meet_url : ""} />
          </div>
        ) : (
          <>
            <div className="mtg-form__link">
              <input
                type="url"
                name="meet_url"
                required={!auto}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
              />
              {auto && (
                <button type="button" className="btn ghost" onClick={() => { setOwnLink(false); setUrl(meeting?.meet_url ?? ""); }}>
                  Let Google make it
                </button>
              )}
            </div>
            {!auto && (
              <div className="msg warn" style={{ margin: "8px 0 0", fontSize: 12.5 }}>
                Meet rooms are not being created in the CRM yet because no Google account is connected.{" "}
                {canSetup ? (
                  <>
                    <a href="/meetings/settings">Connect one in Meeting settings</a> and this box goes away.
                  </>
                ) : (
                  "Ask the super admin to connect one in Meeting settings. Until then, paste a Meet link here."
                )}
              </div>
            )}
            {url && !looksLikeMeet && (
              <small style={{ color: "#8a5a00", fontSize: 12 }}>
                That is not a Google Meet link. It still works if it is a video call link people can open.
              </small>
            )}
          </>
        )}
      </div>

      <div className="f">
        <span>
          Who should be there? <small style={{ fontWeight: 400, color: "var(--muted)" }}>{picked.length} tagged</small>
        </span>
        <div className="mtg-people">
          <div className="mtg-people__bar">
            <input type="search" placeholder="Search the team…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the team" />
            <button type="button" className="btn ghost sm" onClick={() => setPicked(others.map((p) => p.id))}>
              Everyone
            </button>
            {picked.length > 0 && (
              <button type="button" className="btn ghost sm" onClick={() => setPicked([])}>
                Clear
              </button>
            )}
          </div>
          <div className="mtg-people__list">
            {shown.map((p) => (
              <label key={p.id} className={`mtg-person${picked.includes(p.id) ? " is-on" : ""}`}>
                <input type="checkbox" name="people" value={p.id} checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
                <span className="mtg-person__avatar" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase()}</span>
                <span>
                  <b>{p.name}</b>
                  <small>{ROLE_LABEL[p.role] ?? p.role}</small>
                </span>
              </label>
            ))}
            {shown.length === 0 && <p className="empty" style={{ margin: 8 }}>Nobody matches.</p>}
          </div>
        </div>
        <small style={{ color: "var(--muted)", fontSize: 12 }}>
          Everyone tagged gets an email invite with a calendar entry, a notice in the CRM, and a reminder
          10 minutes before it starts.
        </small>
      </div>

      <label className="f">
        <span>
          Agenda <small style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</small>
        </span>
        <textarea name="agenda" rows={3} defaultValue={meeting?.agenda} placeholder="1. Last week's numbers  2. Stuck leads  3. Next week's campaigns" />
      </label>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : meeting ? "Save changes" : "Schedule and send invites"}
        </button>
        {onDone && (
          <button type="button" className="btn ghost" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { seenMeetingAction } from "@/app/actions/meetings";
import { readNotificationsAction } from "@/app/actions/notifications";
import type { Meeting } from "@/lib/types";
import { usePulse } from "./pulse";

const KEY = "bsq-meeting-dismissed";
/** Never more than this on screen at once; the rest roll up into one line. */
const MAX_SOON = 2;
const MAX_REST = 2;

function readDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function writeDismissed(ids: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids.slice(-100)));
  } catch {
    // Private windows can refuse storage; the pop-up just comes back next time.
  }
}

function when(s: string) {
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime())
    ? s
    : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Rings the desktop notification too, when the person has allowed it. */
function desktop(title: string, body: string, url?: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const n = new Notification(title, { body, icon: "/logo-icon.webp", tag: title });
    if (url) n.onclick = () => window.open(url, "_blank", "noopener");
  } catch {
    // Some browsers throw outside a secure context; the in-page card still shows.
  }
}

/**
 * The pop-ups, on every page of the CRM: a meeting inside ten minutes (with
 * a countdown and Join), a new meeting invite, and a new announcement. Fed by
 * the shared live check; each shows once per tab until dismissed.
 */
export default function MeetingAlerts() {
  const { soon, invites, announcements, fetchedAt, refresh } = usePulse();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [, setTick] = useState(0);
  const rung = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(readDismissed());
    const c = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(c);
  }, []);

  const minsLeft = (m: Meeting) => m.starts_in_min - Math.floor((Date.now() - fetchedAt) / 60000);

  const allSoon = soon.filter((m) => !dismissed.includes(`s${m.id}`));
  const allInv = invites.filter((m) => !dismissed.includes(`i${m.id}`) && !soon.some((s) => s.id === m.id));
  const allAnn = announcements.filter((a) => !dismissed.includes(`a${a.id}`));

  // A quiet week and a busy one should look the same size on screen: a wall of
  // cards covers the page it is trying to interrupt.
  const showSoon = allSoon.slice(0, MAX_SOON);
  const rest = [...allAnn, ...allInv];
  const showAnn = allAnn.slice(0, MAX_REST);
  const showInv = allInv.slice(0, Math.max(0, MAX_REST - showAnn.length));
  const hidden = allSoon.length - showSoon.length + rest.length - showAnn.length - showInv.length;

  useEffect(() => {
    for (const m of showSoon) {
      if (rung.current.has(`s${m.id}`)) continue;
      rung.current.add(`s${m.id}`);
      const left = minsLeft(m);
      desktop(left > 0 ? `Starts in ${left} min: ${m.title}` : `Happening now: ${m.title}`, "Click to join on Google Meet.", m.meet_url);
    }
    for (const m of showInv) {
      if (rung.current.has(`i${m.id}`)) continue;
      rung.current.add(`i${m.id}`);
      desktop(`Meeting invite: ${m.title}`, `${when(m.start_at)} · from ${m.organizer_name}`);
    }
    for (const a of showAnn) {
      if (rung.current.has(`a${a.id}`)) continue;
      rung.current.add(`a${a.id}`);
      desktop(`Announcement: ${a.title}`, a.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soon, invites, announcements, dismissed]);

  const dismiss = (key: string, after?: () => Promise<unknown>) => {
    const next = [...dismissed, key];
    setDismissed(next);
    writeDismissed(next);
    if (after) after().then(refresh);
  };

  if (showSoon.length === 0 && showInv.length === 0 && showAnn.length === 0) return null;

  const dismissAll = () => {
    const keys = [
      ...allSoon.map((m) => `s${m.id}`),
      ...allInv.map((m) => `i${m.id}`),
      ...allAnn.map((a) => `a${a.id}`),
    ];
    const next = [...dismissed, ...keys];
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <div className="mtg-alerts" role="region" aria-label="Notifications">
      {showSoon.map((m) => {
        const left = minsLeft(m);
        return (
          <div key={`s${m.id}`} className="mtg-alert is-soon" role="alert">
            <div className="mtg-alert__top">
              <span className="mtg-alert__dot" aria-hidden="true" />
              <strong>{left > 0 ? `Starts in ${left} min` : "Happening now"}</strong>
              <button type="button" className="mtg-alert__x" aria-label="Dismiss" onClick={() => dismiss(`s${m.id}`)}>
                ×
              </button>
            </div>
            <div className="mtg-alert__title">{m.title}</div>
            <div className="mtg-alert__meta">
              {when(m.start_at)} · {m.people.length} people · {m.organizer_name}
            </div>
            <a className="btn sm mtg-join" href={m.meet_url} target="_blank" rel="noopener noreferrer">
              Join Google Meet
            </a>
          </div>
        );
      })}
      {showInv.map((m) => (
        <div key={`i${m.id}`} className="mtg-alert">
          <div className="mtg-alert__top">
            <strong>New meeting invite</strong>
            <button type="button" className="mtg-alert__x" aria-label="Dismiss" onClick={() => dismiss(`i${m.id}`, () => seenMeetingAction(m.id))}>
              ×
            </button>
          </div>
          <div className="mtg-alert__title">{m.title}</div>
          <div className="mtg-alert__meta">
            {when(m.start_at)} · {m.duration_min} min · from {m.organizer_name}
          </div>
          <Link href="/meetings" className="btn ghost sm" onClick={() => dismiss(`i${m.id}`, () => seenMeetingAction(m.id))}>
            View meeting
          </Link>
        </div>
      ))}
      {showAnn.map((a) => (
        <div key={`a${a.id}`} className="mtg-alert is-ann">
          <div className="mtg-alert__top">
            <strong>Announcement</strong>
            <button
              type="button"
              className="mtg-alert__x"
              aria-label="Dismiss"
              onClick={() => dismiss(`a${a.id}`, () => readNotificationsAction({ ids: [a.id] }))}
            >
              ×
            </button>
          </div>
          <div className="mtg-alert__title">{a.title}</div>
          {a.body && <div className="mtg-alert__meta mtg-alert__body">{a.body}</div>}
          <Link
            href={a.link || "/announcements"}
            className="btn ghost sm"
            onClick={() => dismiss(`a${a.id}`, () => readNotificationsAction({ ids: [a.id] }))}
          >
            Read it
          </Link>
        </div>
      ))}
      {hidden > 0 && (
        <div className="mtg-alert is-more">
          <Link href="/notifications" onClick={dismissAll}>
            {hidden} more notification{hidden === 1 ? "" : "s"}
          </Link>
          <button type="button" className="mtg-alert__x" aria-label="Dismiss all" onClick={dismissAll}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

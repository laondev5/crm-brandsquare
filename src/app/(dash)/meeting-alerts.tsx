"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { seenMeetingAction } from "@/app/actions/meetings";
import type { Meeting } from "@/lib/types";

const POLL_MS = 30_000;
const KEY = "bsq-meeting-dismissed";

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
 * The in-app half of meeting notifications, on every page of the CRM.
 *
 * Asks every half minute for meetings about to start and invites not yet
 * seen. A meeting inside ten minutes shows a countdown card with Join; a new
 * invite shows a card that opens the Meetings page. Each shows once per tab
 * until dismissed.
 */
export default function MeetingAlerts() {
  const [soon, setSoon] = useState<Meeting[]>([]);
  const [invites, setInvites] = useState<Meeting[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [tick, setTick] = useState(0);
  const rung = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/meetings/soon", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { soon: Meeting[]; invites: Meeting[] };
      setSoon(d.soon ?? []);
      setInvites(d.invites ?? []);
      setFetchedAt(Date.now());
    } catch {
      // Offline for a moment; the next check will catch up.
    }
  }, []);

  useEffect(() => {
    setDismissed(readDismissed());
    load();
    const t = setInterval(load, POLL_MS);
    const c = setInterval(() => setTick((n) => n + 1), 15_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      clearInterval(c);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  // Minutes to go, counted down locally between checks.
  const minsLeft = (m: Meeting) => m.starts_in_min - Math.floor((Date.now() - fetchedAt) / 60000);

  const showSoon = soon.filter((m) => !dismissed.includes(`s${m.id}`));
  const showInv = invites.filter((m) => !dismissed.includes(`i${m.id}`) && !soon.some((s) => s.id === m.id));

  useEffect(() => {
    for (const m of showSoon) {
      const k = `s${m.id}`;
      if (rung.current.has(k)) continue;
      rung.current.add(k);
      const left = minsLeft(m);
      desktop(left > 0 ? `Starts in ${left} min: ${m.title}` : `Happening now: ${m.title}`, "Click to join on Google Meet.", m.meet_url);
    }
    for (const m of showInv) {
      const k = `i${m.id}`;
      if (rung.current.has(k)) continue;
      rung.current.add(k);
      desktop(`Meeting invite: ${m.title}`, `${when(m.start_at)} · from ${m.organizer_name}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soon, invites, dismissed]);

  const dismiss = (key: string, seenId?: number) => {
    const next = [...dismissed, key];
    setDismissed(next);
    writeDismissed(next);
    if (seenId) seenMeetingAction(seenId);
  };

  if (showSoon.length === 0 && showInv.length === 0) return null;
  void tick;

  return (
    <div className="mtg-alerts" role="region" aria-label="Meeting notifications">
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
            <button type="button" className="mtg-alert__x" aria-label="Dismiss" onClick={() => dismiss(`i${m.id}`, m.id)}>
              ×
            </button>
          </div>
          <div className="mtg-alert__title">{m.title}</div>
          <div className="mtg-alert__meta">
            {when(m.start_at)} · {m.duration_min} min · from {m.organizer_name}
          </div>
          <Link href="/meetings" className="btn ghost sm" onClick={() => dismiss(`i${m.id}`, m.id)}>
            View meeting
          </Link>
        </div>
      ))}
    </div>
  );
}

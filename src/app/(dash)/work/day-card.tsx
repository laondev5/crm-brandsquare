"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInAction, signOutAction } from "@/app/actions/work";
import type { Workday } from "@/lib/types";

const MOODS = [
  { key: "good", label: "Good day", icon: "🙂" },
  { key: "ok", label: "Steady", icon: "😐" },
  { key: "rough", label: "Rough one", icon: "😕" },
];

function clock(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime())
    ? null
    : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function minutesBetween(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const a = new Date(from.replace(" ", "T")).getTime();
  const b = new Date(to.replace(" ", "T")).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return null;
  return Math.floor((b - a) / 60000);
}

function words(mins: number | null) {
  if (mins === null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Start and end of the working day.
 *
 * Signing out is a form, not a button, and that is the whole point: the time
 * somebody stopped tells a manager nothing they can act on, while "shipped the
 * quote template, blocked on the customs contact" tells them what to do next.
 */
export default function DayCard({
  workday,
  serverNow,
}: {
  workday: Workday | null;
  /** The server's clock at the time this page was rendered. */
  serverNow: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [mood, setMood] = useState("ok");

  const signedIn = !!workday?.signed_in_at;
  const signedOut = !!workday?.signed_out_at;
  const open = signedIn && !signedOut;

  /*
   * How long the day has been running.
   *
   * Both stamps come from the server, so the answer does not depend on the
   * browser's clock agreeing with it — comparing a server timestamp against
   * Date.now() is wrong by the gap between the two timezones, which made a
   * day that began a minute ago read as an hour old.
   *
   * Minutes since the page loaded are then added locally, which is only ever
   * a difference of elapsed time and so carries no timezone with it.
   */
  const [sinceLoad, setSinceLoad] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setSinceLoad((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [open]);

  const atRender = minutesBetween(workday?.signed_in_at ?? null, serverNow);
  const elapsed = atRender === null ? null : atRender + sinceLoad;
  const worked = minutesBetween(workday?.signed_in_at ?? null, workday?.signed_out_at ?? null);

  const run = (fn: () => Promise<{ ok: true } | { error: string }>) => {
    setErr("");
    start(async () => {
      const res = await fn();
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setLeaving(false);
      router.refresh();
    });
  };

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Your day</h2>
        {open && <span className="pill s-active">Working · {words(elapsed) ?? "just now"}</span>}
        {signedOut && <span className="pill">Signed out</span>}
        <div style={{ flex: 1 }} />

        {!signedIn && !signedOut && (
          <button className="btn" disabled={busy} onClick={() => run(() => signInAction())}>
            {busy ? "Starting…" : "Sign in for today"}
          </button>
        )}
        {open && !leaving && (
          <button className="btn" disabled={busy} onClick={() => setLeaving(true)}>
            Sign out
          </button>
        )}
        {signedOut && (
          <button className="btn ghost" disabled={busy} onClick={() => run(() => signInAction())}>
            Back to work
          </button>
        )}
      </div>

      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      {(signedIn || signedOut) && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>
          In at <b>{clock(workday!.signed_in_at) ?? "—"}</b>
          {signedOut && (
            <>
              {" · "}out at <b>{clock(workday!.signed_out_at)}</b>
              {" · "}
              {words(worked) ?? "—"} on the clock
            </>
          )}
        </p>
      )}

      {/* The end-of-day report. Asked for at the moment somebody is trying to
          leave, which is the only time they still remember the detail. */}
      {leaving && (
        <form
          action={(form) => run(() => signOutAction(form))}
          style={{ marginTop: 14, display: "grid", gap: 12 }}
        >
          <label className="f">
            <span>What did you get done today?</span>
            <textarea
              name="summary"
              rows={3}
              required
              placeholder="Sent three quotations, finished the rice mill spec sheet…"
            />
          </label>

          <label className="f">
            <span>Anything blocking you?</span>
            <textarea
              name="blockers"
              rows={2}
              placeholder="Still waiting on the customs agent to confirm duty rates."
            />
          </label>

          <label className="f">
            <span>What is first tomorrow?</span>
            <textarea name="plan_tomorrow" rows={2} placeholder="Chase the two open quotations." />
          </label>

          <div className="f">
            <span>How did it go?</span>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {MOODS.map((m) => (
                <label
                  key={m.key}
                  className="pill"
                  style={{
                    cursor: "pointer",
                    opacity: mood === m.key ? 1 : 0.5,
                    display: "inline-flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="radio"
                    name="mood"
                    value={m.key}
                    checked={mood === m.key}
                    onChange={() => setMood(m.key)}
                  />
                  <span aria-hidden="true">{m.icon}</span>
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button className="btn" disabled={busy}>
              {busy ? "Saving…" : "Save and sign out"}
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => setLeaving(false)}
            >
              Not yet
            </button>
          </div>
        </form>
      )}

      {signedOut && workday?.summary && (
        <div style={{ marginTop: 14 }}>
          <table className="kv">
            <tbody>
              <tr>
                <th style={{ width: 150 }}>Got done</th>
                <td style={{ whiteSpace: "pre-wrap" }}>{workday.summary}</td>
              </tr>
              {workday.blockers && (
                <tr>
                  <th>Blocked by</th>
                  <td style={{ whiteSpace: "pre-wrap", color: "var(--err)" }}>{workday.blockers}</td>
                </tr>
              )}
              {workday.plan_tomorrow && (
                <tr>
                  <th>First tomorrow</th>
                  <td style={{ whiteSpace: "pre-wrap" }}>{workday.plan_tomorrow}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!signedIn && !signedOut && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>
          Sign in to start the day. When you sign out you will be asked what moved and what is in
          your way — that is what the manager sees, so nobody has to chase you for an update.
        </p>
      )}
    </div>
  );
}

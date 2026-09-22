import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { workMember } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/types";
import { BlockerOwner } from "../../day-card";

const RANGES = [7, 30, 90];

const dt = (iso: string | null, opts: Intl.DateTimeFormatOptions) => {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", opts);
};
const time = (iso: string | null) => dt(iso, { hour: "2-digit", minute: "2-digit" });
const stamp = (iso: string | null) => dt(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dayName = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

function minutes(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const x = new Date(a.replace(" ", "T")).getTime();
  const y = new Date(b.replace(" ", "T")).getTime();
  return isNaN(x) || isNaN(y) ? null : Math.max(0, Math.round((y - x) / 60000));
}
const hours = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

/** "Chrome on Windows" from a user-agent string, which is all anyone needs. */
function device(ua: string) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One person, for a manager: when they opened the CRM, every working day with
 * the report they wrote, what they did on leads, and what is on their board.
 */
export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;

  let m;
  try {
    m = await workMember(me, Number(id), days);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return <div className="msg err">Could not load this team member. The WordPress plugin needs to be version 1.24.0 or newer.</div>;
  }

  const worked = m.workdays.map((d) => minutes(d.signed_in_at, d.signed_out_at)).filter((x): x is number => x !== null);
  const avg = worked.length ? Math.round(worked.reduce((a, b) => a + b, 0) / worked.length) : null;
  const reported = m.workdays.filter((d) => d.summary.trim()).length;

  return (
    <>
      <div className="head">
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {m.user.name}
          <span className="pill">{ROLE_LABEL[m.user.role]}</span>
          {m.user.status !== "active" && <span className="pill s-disabled">{cap(m.user.status)}</span>}
        </h1>
        <div className="spacer" />
        <Link href="/work/team" className="btn ghost">
          Back to team
        </Link>
        <div className="tabs" style={{ marginBottom: 0, width: "100%" }}>
          {RANGES.map((d) => (
            <Link key={d} href={`/work/team/${m.user.id}?days=${d}`} className={d === days ? "on" : ""}>
              Last {d} days
            </Link>
          ))}
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -6 }}>
        {m.user.email} · last opened the CRM {stamp(m.user.last_login_at)}
      </p>

      <div className="stats">
        <div className="stat t-open"><span>Days signed in</span><b>{m.workdays.filter((d) => d.signed_in_at).length}</b></div>
        <div className="stat t-won"><span>Reports written</span><b>{reported}</b></div>
        <div className="stat t-quiet"><span>Average day</span><b>{avg === null ? "—" : hours(avg)}</b></div>
        <div className="stat t-total"><span>Open leads</span><b>{m.open_leads}</b></div>
        <div className="stat t-today"><span>Open tasks</span><b>{m.tasks.length}</b></div>
      </div>

      <h2>Daily reports</h2>
      <div className="card" style={{ padding: "6px 8px", overflowX: "auto", marginBottom: 24 }}>
        {m.workdays.length === 0 ? (
          <p className="empty">No working days recorded yet.</p>
        ) : (
          <table className="tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ width: 120 }}>Day</th>
                <th style={{ width: 130 }}>In / out</th>
                <th>What they got done</th>
                <th style={{ width: 200 }}>Blocked by</th>
                <th style={{ width: 200 }}>First tomorrow</th>
              </tr>
            </thead>
            <tbody>
              {m.workdays.map((d) => {
                const w = minutes(d.signed_in_at, d.signed_out_at);
                return (
                  <tr key={d.work_date}>
                    <td data-l="Day" style={{ fontWeight: 600, color: "var(--ink)" }}>{dayName(d.work_date)}</td>
                    <td data-l="In / out" style={{ fontSize: 12.5 }}>
                      {time(d.signed_in_at)} – {d.signed_out_at ? time(d.signed_out_at) : "no sign-out"}
                      {w !== null && <small style={{ display: "block", color: "var(--muted)" }}>{hours(w)}</small>}
                    </td>
                    <td data-l="Done" style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                      {d.summary || <span style={{ color: "var(--muted)" }}>No report</span>}
                    </td>
                    <td data-l="Blocked" style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--err)" }}>
                      {d.blockers}
                      {d.blockers && <BlockerOwner day={d} />}
                    </td>
                    <td data-l="Tomorrow" style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{d.plan_tomorrow}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <div className="card">
          <h2>What they did on leads</h2>
          {m.activity.length === 0 ? (
            <p className="empty" style={{ padding: "10px 0" }}>Nothing recorded.</p>
          ) : (
            <ul className="tl" style={{ maxHeight: 520, overflowY: "auto" }}>
              {m.activity.map((a) => (
                <li key={a.id}>
                  <b>{cap(a.type)}</b>{" "}
                  <Link href={`/leads/${a.lead_id}`} style={{ color: "var(--p)" }}>
                    {a.lead_name || `Lead #${a.lead_id}`}
                  </Link>
                  {(a.from_value || a.to_value) && (
                    <span> — {a.from_value ? `${a.from_value} → ${a.to_value}` : a.to_value}</span>
                  )}
                  <small>{stamp(a.created_at)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          <div className="card">
            <h2>When they opened the CRM</h2>
            {m.logins.length === 0 ? (
              <p className="empty" style={{ padding: "10px 0" }}>No sign-ins on record.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                {m.logins.map((l, i) => (
                  <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                    <span>{stamp(l.at)}</span>
                    <small style={{ color: "var(--muted)" }}>{device(l.user_agent)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2>On their board now</h2>
            {m.tasks.length === 0 ? (
              <p className="empty" style={{ padding: "10px 0" }}>No open tasks.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                {m.tasks.map((t) => (
                  <li key={t.id} style={{ fontSize: 13 }}>
                    <strong style={{ color: "var(--ink)" }}>{t.title}</strong>
                    <small style={{ display: "block", color: t.stage === "blocked" ? "var(--err)" : "var(--muted)" }}>
                      {t.stage === "blocked" ? `Blocked: ${t.blocker || "no reason given"}` : cap(t.stage)}
                      {t.project && ` · ${t.project}`}
                      {t.due_date && ` · due ${t.due_date}${t.due_time ? ` ${t.due_time}` : ""}`}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

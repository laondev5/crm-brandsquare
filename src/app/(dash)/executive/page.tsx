import Link from "next/link";
import { requireOverseer } from "@/lib/auth";
import { getExecutive } from "@/lib/queries";
import { ROLE_LABEL, type ExecutiveReport } from "@/lib/types";
import { buildBriefing } from "@/lib/exec-briefing";
import LineChart, { type ChartPoint } from "../line-chart";
import TeamTable from "./team-table";
import ReportsFeed from "./reports-feed";
import ActivityFeed from "./activity-feed";
import VoiceReport from "./voice-report";

/** The three views the MD asked for. The plugin also knows 90 days. */
const RANGES = [
  { days: 1, label: "24 hours", note: "the last 24 hours, hour by hour" },
  { days: 7, label: "Weekly", note: "the last 7 days" },
  { days: 30, label: "Monthly", note: "the last 30 days" },
];

/**
 * The MD's view of the whole business.
 *
 * One page, read top to bottom: the headline numbers against the period
 * before, the trend, where the leads are and where they came from, then every
 * person side by side and everything they wrote and did. Nothing here needs a
 * click through to someone's own page to understand -- that was the brief.
 */
export default async function ExecutivePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const me = await requireOverseer();
  const sp = await searchParams;
  const range = RANGES.find((r) => r.days === Number(sp.days)) ?? RANGES[1];

  let data: ExecutiveReport;
  try {
    data = await getExecutive(me, range.days);
  } catch {
    return (
      <>
        <div className="head">
          <h1>Executive report</h1>
        </div>
        <div className="msg err">
          Could not load the report. The Brandsquare plugin on the website needs to be version 1.27
          or newer.
        </div>
      </>
    );
  }

  const c = data.current;
  const p = data.previous;
  const hourly = data.bucket === "hour";
  const snap = data.snapshot;

  const points: ChartPoint[] = data.series.map((s) => {
    const [date, time] = s.day.split(" ");
    return {
      label: hourly && time ? time : s.day.slice(5).replace("-", "/"),
      title:
        new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) +
        (hourly && time ? `, ${time}` : ""),
      values: { leads: s.leads, won: s.won, visitors: s.visitors, wa_in: s.wa_in, actions: s.actions },
    };
  });

  const stageMax = Math.max(1, ...data.stages.map((s) => s.count));
  const campMax = Math.max(1, ...data.campaigns.map((x) => x.leads));
  const srcMax = Math.max(1, ...data.sources.map((x) => x.visitors));

  // The same report, written to be heard. Built here so only the finished
  // script travels to the browser, not a second copy of the data.
  const briefing = buildBriefing(data, (role) => ROLE_LABEL[role] ?? role);

  return (
    <>
      <div className="head">
        <div>
          <h1>Executive report</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Everyone&rsquo;s work and the business in one place — {range.note}, compared with the
            period before.
          </p>
        </div>
        <div className="spacer" />
        <div className="tabs" style={{ marginBottom: 0 }}>
          {RANGES.map((r) => (
            <Link key={r.days} href={`/executive?days=${r.days}`} className={r.days === range.days ? "on" : ""}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Keyed on the period, so switching it stops the voice rather than
          leaving it reading the old report over the new one. */}
      <VoiceReport key={range.days} sections={briefing} />

      {/* Headline numbers, each against the same length of time before it. */}
      <div className="exec-kpis">
        <Kpi label="New leads" now={c.new_leads} before={p.new_leads} />
        <Kpi label="Deals won" now={c.won} before={p.won} tone="won" />
        <Kpi label="Win rate" now={c.win_rate} before={p.win_rate} suffix="%" hint={`${c.won} won · ${c.lost} lost`} />
        <Kpi label="Website visitors" now={c.visitors} before={p.visitors} hint={`${c.views.toLocaleString()} page views`} />
        <Kpi label="WhatsApp received" now={c.wa_in} before={p.wa_in} />
        <Kpi label="WhatsApp sent" now={c.wa_out} before={p.wa_out} />
        <Kpi label="Emails sent" now={c.emails} before={p.emails} />
        <Kpi label="Team actions on leads" now={c.actions} before={p.actions} hint={`${c.notes} notes · ${c.tasks_done} tasks done`} />
      </div>

      {/* What is waiting on somebody right now, whatever the period. */}
      <div className="exec-attn">
        <Attn label="Open leads" value={snap.open_leads} href={null} />
        <Attn label="Unassigned" value={snap.unassigned} warn={snap.unassigned > 0} />
        <Attn label="Late follow-ups" value={snap.overdue_followups} warn={snap.overdue_followups > 0} />
        <Attn label="Overdue tasks" value={snap.overdue_tasks} warn={snap.overdue_tasks > 0} />
        <Attn label="Blocked tasks" value={snap.blocked_tasks} warn={snap.blocked_tasks > 0} />
        <Attn label="Blockers waiting" value={snap.open_blockers} warn={snap.open_blockers > 0} />
        <Attn label="Signed in today" value={`${snap.signed_in_today} of ${snap.team_size}`} />
        {c.meta_failed > 0 && <Attn label="Ad events refused" value={c.meta_failed} warn />}
      </div>

      <div className="exec-grid">
        <div className="card">
          <h2>Leads and deals won</h2>
          <LineChart
            points={points}
            unit={hourly ? "hours" : "days"}
            series={[
              { key: "leads", label: "New leads", colour: "var(--st-new)", area: true },
              { key: "won", label: "Deals won", colour: "var(--ok)" },
            ]}
            emptyNote="No leads in this period."
          />
        </div>
        <div className="card">
          <h2>Website visitors and WhatsApp</h2>
          <LineChart
            points={points}
            unit={hourly ? "hours" : "days"}
            series={[
              { key: "visitors", label: "Visitors", colour: "var(--st-contacted)", area: true },
              { key: "wa_in", label: "WhatsApp received", colour: "#25a244" },
              { key: "actions", label: "Team actions", colour: "var(--p)" },
            ]}
            emptyNote="No visits in this period."
          />
        </div>
      </div>

      <div className="exec-grid exec-grid--3">
        <div className="card">
          <h2>Pipeline now</h2>
          <Bars
            rows={data.stages.map((s) => ({
              label: s.label,
              value: s.count,
              max: stageMax,
              colour: `var(--st-${s.key}, ${s.type === "won" ? "var(--ok)" : s.type === "lost" ? "var(--err)" : "var(--p)"})`,
            }))}
            empty="No leads yet."
          />
        </div>
        <div className="card">
          <h2>Leads by campaign</h2>
          <Bars
            rows={data.campaigns.map((x) => ({
              label: x.name,
              value: x.leads,
              max: campMax,
              note: x.won ? `${x.won} won` : undefined,
            }))}
            empty="No leads in this period."
          />
        </div>
        <div className="card">
          <h2>Where visitors came from</h2>
          <Bars
            rows={data.sources.map((x) => ({
              label: x.source,
              value: x.visitors,
              max: srcMax,
              colour: "var(--st-contacted)",
              note: x.conversions ? `${x.conversions} enquir${x.conversions === 1 ? "y" : "ies"}` : undefined,
            }))}
            empty="No visits in this period."
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Team performance</h2>
        <p className="board-hint" style={{ marginTop: -6 }}>
          Every person in one table, for {range.note}. Click a column name to sort; click a row to
          read their latest report without leaving the page.
        </p>
        <TeamTable team={data.team} />
      </div>

      <div className="exec-grid" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>Daily reports</h2>
          <ReportsFeed reports={data.reports} />
        </div>
        <div className="card">
          <h2>Activity</h2>
          <ActivityFeed activity={data.activity} />
        </div>
      </div>
    </>
  );
}

function Kpi({
  label,
  now,
  before,
  suffix = "",
  hint,
  tone,
}: {
  label: string;
  now: number;
  before: number;
  suffix?: string;
  hint?: string;
  tone?: "won";
}) {
  const diff = now - before;
  const pct = before ? Math.round((diff / before) * 100) : now ? 100 : 0;
  return (
    <div className={`exec-kpi${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <b>
        {now.toLocaleString()}
        {suffix}
      </b>
      <small className={diff > 0 ? "up" : diff < 0 ? "down" : ""}>
        {diff === 0 ? "No change" : `${diff > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`}
        <em> vs {before.toLocaleString()}{suffix} before</em>
      </small>
      {hint && <i>{hint}</i>}
    </div>
  );
}

function Attn({ label, value, warn = false }: { label: string; value: number | string; warn?: boolean; href?: string | null }) {
  return (
    <div className={`exec-attn__item${warn ? " is-warn" : ""}`}>
      <b>{typeof value === "number" ? value.toLocaleString() : value}</b>
      <span>{label}</span>
    </div>
  );
}

function Bars({
  rows,
  empty,
}: {
  rows: { label: string; value: number; max: number; colour?: string; note?: string }[];
  empty: string;
}) {
  if (rows.length === 0 || rows.every((r) => r.value === 0)) return <p className="empty">{empty}</p>;
  return (
    <div className="exec-bars">
      {rows.map((r, i) => (
        <div key={i} className="exec-bars__row">
          <span className="exec-bars__label" title={r.label}>
            {r.label}
          </span>
          <span className="exec-bars__track">
            <span
              className="exec-bars__fill"
              style={{ width: `${Math.max(2, (r.value / r.max) * 100)}%`, background: r.colour ?? "var(--p)" }}
            />
          </span>
          <span className="exec-bars__value">
            {r.value.toLocaleString()}
            {r.note && <small>{r.note}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}



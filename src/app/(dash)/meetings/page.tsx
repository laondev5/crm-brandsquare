import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { listMeetings, listPeopleNames } from "@/lib/queries";
import { canOversee, isSuperRole, type Meeting } from "@/lib/types";
import MeetingCard from "./meeting-card";
import SchedulePanel from "./schedule-panel";

function dayHeading(s: string) {
  const d = new Date(s.slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return s.slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return diff === 0 ? `Today · ${label}` : diff === 1 ? `Tomorrow · ${label}` : diff === -1 ? `Yesterday · ${label}` : label;
}

/**
 * Meetings: scheduled here, held on Google Meet.
 *
 * Upcoming ones are grouped by day with Join on each; opening the page counts
 * as having seen the invites on it.
 */
export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; all?: string; new?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const past = sp.tab === "past";
  const all = sp.all === "1" && canOversee(me.role);

  const [data, people] = await Promise.all([
    listMeetings(me, { when: past ? "past" : "upcoming", all, markSeen: !past }).catch(() => null),
    listPeopleNames().catch(() => []),
  ]);

  const href = (o: { tab?: string; all?: boolean }) => {
    const p = new URLSearchParams();
    if ((o.tab ?? (past ? "past" : "")) === "past") p.set("tab", "past");
    if (o.all ?? all) p.set("all", "1");
    const s = p.toString();
    return `/meetings${s ? `?${s}` : ""}`;
  };

  const meetings = data?.meetings ?? [];
  const groups: { day: string; items: Meeting[] }[] = [];
  for (const m of meetings) {
    const day = m.start_at.slice(0, 10);
    const g = groups.find((x) => x.day === day);
    if (g) g.items.push(m);
    else groups.push({ day, items: [m] });
  }

  return (
    <>
      <div className="head">
        <h1>Meetings</h1>
        <div className="spacer" />
        {isSuperRole(me.role) && (
          <Link href="/meetings/settings" className="btn ghost">
            Meeting settings
          </Link>
        )}
        <div className="tabs" style={{ marginBottom: 0 }}>
          <Link href={href({ tab: "" })} className={past ? "" : "on"}>
            Upcoming
          </Link>
          <Link href={href({ tab: "past" })} className={past ? "on" : ""}>
            Past
          </Link>
        </div>
      </div>

      {!data && (
        <div className="msg err">
          Could not load meetings. The Brandsquare plugin on the website needs to be version 1.28 or newer.
        </div>
      )}

      {!past && <SchedulePanel people={people} meId={me.id} openAtStart={sp.new === "1"} google={data?.google} />}

      {canOversee(me.role) && (
        <div className="tabs" style={{ marginBottom: 14 }}>
          <Link href={href({ all: false })} className={all ? "" : "on"}>
            My meetings
          </Link>
          <Link href={href({ all: true })} className={all ? "on" : ""}>
            Everyone&rsquo;s meetings
          </Link>
        </div>
      )}

      {data && meetings.length === 0 && (
        <div className="card">
          <p className="empty">
            {past ? "No past meetings yet." : "No meetings coming up. Schedule one and tag the people who should be there."}
          </p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.day} style={{ marginBottom: 18 }}>
          <h2 className="mtg-day">{dayHeading(g.day)}</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {g.items.map((m) => (
              <MeetingCard key={m.id} m={m} people={people} meId={me.id} past={past} google={data?.google} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

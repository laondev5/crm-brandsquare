import type { ExecActivity, ExecPerson, ExecutiveReport, Workday } from "./types";

/**
 * The executive report, written to be listened to.
 *
 * Listening is not reading. There is no scrolling back and no scanning ahead,
 * so the order matters more than it does on screen: what the business did,
 * then what needs somebody's attention, then the detail. Numbers are turned
 * into sentences ("up 27 percent from 11") because a table read aloud is
 * unbearable, and a zero is said once rather than listed eight times.
 *
 * Two things are deliberately not read out in full. The activity log is a
 * hundred-odd lines of "X moved Y to Z", which is a record to search, not
 * something to hear, so it is summarised. And the daily reports are capped,
 * with unresolved blockers read first, because a month of them would run for
 * an hour. The report on screen is untouched and says how much was left out.
 *
 * Kept free of any browser or framework code so it can be tested by itself:
 * what will be spoken is worth checking before anyone hears it.
 */

export interface BriefSection {
  key: string;
  title: string;
  lines: string[];
}

export interface BriefChunk {
  /** Index into the sections, so the player can skip by section. */
  section: number;
  text: string;
}

/** Daily reports read aloud. Past this the rest is left on the screen. */
const MAX_REPORTS = 12;
/** Any one written field, so a rambling note cannot take two minutes. */
const MAX_FIELD = 700;
/** Short enough to stay under the point where some engines cut a long
 *  utterance off, which Chrome's network voices do after about fifteen seconds. */
const MAX_CHUNK = 160;

const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");

/** "1 lead", "14 leads", "no leads". */
function count(n: number, one: string, many = `${one}s`) {
  return n === 0 ? `no ${many}` : `${fmt(n)} ${n === 1 ? one : many}`;
}

/** "a", "a and b", "a, b and c". */
function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Written text made fit to be spoken.
 *
 * A link read letter by letter is the worst thing a speech engine does, so it
 * becomes "a link". Emoji are dropped rather than announced ("smiling face
 * with smiling eyes"), and a bulleted list becomes sentences so the engine
 * pauses where a reader's eye would.
 */
export function say(raw: string): string {
  return String(raw ?? "")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "a link")
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .replace(/^[ \t]*[-*•▪◦]\s+/gm, "")
    .replace(/([.!?:;,])?[ \t]*\r?\n+[ \t]*/g, (_m, p) => (p ? `${p} ` : ". "))
    .replace(/\s*\(([^)]*)\)/g, ", $1")
    .replace(/&/g, " and ")
    .replace(/[▲▼→←·]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.!?])\s*\./g, "$1")
    .trim();
}

/** A name of a stage or campaign, where "/" would otherwise be read as "slash". */
function label(raw: string) {
  return say(raw).replace(/\s*\/\s*/g, " or ");
}

/** A stage by its plain name. "Won (After-sales)" is "Won" out loud: the
 *  bracket is a note for the screen, and read aloud it becomes a stray comma. */
function stageName(raw: string) {
  return label(String(raw ?? "").replace(/\s*\([^)]*\)/g, ""));
}

/**
 * Makes sure a piece of text ends where the voice should stop.
 *
 * A speech engine pauses at punctuation and nowhere else. People write the
 * last line of a note, or a bullet, without a full stop, and the next thing
 * said then runs straight on from it: "called supplier Blocked by".
 */
function stop(text: string) {
  const t = text.replace(/[,;:\s]+$/, "");
  return t === "" || /[.!?]$/.test(t) ? t : `${t}.`;
}

/** A written field, cut at a sentence when it runs long, and always ended. */
function clip(raw: string, limit = MAX_FIELD) {
  const text = say(raw);
  if (text.length <= limit) return stop(text);
  const head = text.slice(0, limit);
  const at = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  const cut = at > limit * 0.4 ? head.slice(0, at + 1) : head.slice(0, head.lastIndexOf(" "));
  return `${stop(cut.trim())} The rest is on screen.`;
}

function parse(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(String(iso).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

/** The site's own clock is what is written down, so it is read back as
 *  written rather than converted into whatever zone this browser is in. */
function spokenDate(iso: string | null | undefined) {
  const d = parse(iso && iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "";
}

function spokenTime(iso: string | null | undefined) {
  const d = parse(iso);
  return d ? d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
}

/** ", up 27 percent from 11", ", the same as before", or nothing when both are zero. */
function versus(now: number, before: number) {
  if (now === before) return before === 0 ? "" : ", the same as before";
  if (before === 0) return ", up from none";
  const pct = Math.round((Math.abs(now - before) / before) * 100);
  return `, ${now > before ? "up" : "down"} ${pct} percent from ${fmt(before)}`;
}

export function buildBriefing(
  data: ExecutiveReport,
  roleLabel: (role: ExecPerson["role"]) => string = (r) => r,
  business = "Brandsquare"
): BriefSection[] {
  const c = data.current;
  const p = data.previous;
  const s = data.snapshot;
  const hourly = data.bucket === "hour";

  const now = data.days === 1 ? "the last 24 hours" : `the last ${data.days} days`;
  const before = data.days === 1 ? "the 24 hours before" : `the ${data.days} days before`;

  const sections: BriefSection[] = [];

  /* ---------------- headlines ---------------- */

  const headlines: string[] = [];
  const stamp = spokenDate(data.now);
  headlines.push(
    `${business} executive report for ${now}.${stamp ? ` Prepared on ${stamp}, at ${spokenTime(data.now)}.` : ""}`,
    `Every figure is compared with ${before}.`
  );
  headlines.push(`There ${c.new_leads === 1 ? "was" : "were"} ${count(c.new_leads, "new lead")}${versus(c.new_leads, p.new_leads)}.`);

  if (c.won + c.lost === 0) {
    headlines.push("No deals were closed either way.");
  } else {
    const prevRate = p.won + p.lost > 0 ? `, against ${Math.round(p.win_rate)} percent before` : "";
    headlines.push(
      `${count(c.won, "deal")} won${versus(c.won, p.won)}, and ${fmt(c.lost)} lost. That is a win rate of ${Math.round(c.win_rate)} percent${prevRate}.`
    );
  }

  headlines.push(
    c.visitors === 0
      ? "The website had no visitors."
      : `The website had ${count(c.visitors, "visitor")}${versus(c.visitors, p.visitors)}, viewing ${fmt(c.views)} ${c.views === 1 ? "page" : "pages"}.`
  );

  headlines.push(
    `On WhatsApp, ${count(c.wa_in, "message")} came in${versus(c.wa_in, p.wa_in)}, and ${c.wa_out === 0 ? "none" : fmt(c.wa_out)} went out.`
  );
  headlines.push(`${count(c.emails, "email")} ${c.emails === 1 ? "was" : "were"} sent${versus(c.emails, p.emails)}.`.replace(/^no/, "No"));

  const work: string[] = [];
  if (c.notes > 0) work.push(count(c.notes, "note"));
  const done = c.tasks_done > 0 ? ` ${count(c.tasks_done, "task")} ${c.tasks_done === 1 ? "was" : "were"} completed.` : "";
  headlines.push(
    c.actions === 0
      ? `The team recorded no actions on leads.${done}`
      : `The team recorded ${count(c.actions, "action")} on leads${versus(c.actions, p.actions)}${work.length ? `, including ${list(work)}` : ""}.${done}`
  );

  sections.push({ key: "headlines", title: "Headlines", lines: headlines });

  /* ---------------- what needs attention ---------------- */

  const problems: string[] = [];
  if (s.unassigned > 0) problems.push(`${count(s.unassigned, "lead")} ${s.unassigned === 1 ? "is" : "are"} not assigned to anyone`);
  if (s.overdue_followups > 0) problems.push(`${count(s.overdue_followups, "follow-up")} ${s.overdue_followups === 1 ? "is" : "are"} late`);
  if (s.overdue_tasks > 0) problems.push(`${count(s.overdue_tasks, "task")} ${s.overdue_tasks === 1 ? "is" : "are"} overdue`);
  if (s.blocked_tasks > 0) problems.push(`${count(s.blocked_tasks, "task")} ${s.blocked_tasks === 1 ? "is" : "are"} blocked`);
  if (s.open_blockers > 0) problems.push(`${count(s.open_blockers, "blocker")} ${s.open_blockers === 1 ? "is" : "are"} waiting to be cleared`);
  if (c.meta_failed > 0) problems.push(`${count(c.meta_failed, "ad event")} ${c.meta_failed === 1 ? "was" : "were"} refused by Meta`);

  const attention: string[] = [];
  attention.push(
    problems.length === 0
      ? "Nothing needs attention right now. There are no unassigned leads, late follow-ups, overdue tasks or open blockers."
      : `${problems.length === 1 ? "One thing needs" : "Things that need"} attention. ${list(problems)}.`
  );
  attention.push(
    `${s.signed_in_today} of ${s.team_size} ${s.team_size === 1 ? "person has" : "people have"} signed in today.`
  );
  sections.push({ key: "attention", title: "What needs attention", lines: attention });

  /* ---------------- pipeline ---------------- */

  const pipeline: string[] = [];
  pipeline.push(
    s.open_leads === 0
      ? "There are no open leads in the pipeline."
      : `${count(s.open_leads, "lead")} ${s.open_leads === 1 ? "is" : "are"} open in the pipeline.`
  );
  // Number first: "9 in New Inquiry" is clear to the ear where "New Inquiry,
  // 9" sounds like the start of a longer list.
  const open = data.stages.filter((x) => x.type === "open" && x.count > 0);
  if (open.length) pipeline.push(`By stage: ${open.map((x) => `${fmt(x.count)} in ${stageName(x.label)}`).join("; ")}.`);
  const closed = data.stages.filter((x) => x.type !== "open" && x.count > 0);
  if (closed.length) pipeline.push(`Closed: ${closed.map((x) => `${fmt(x.count)} in ${stageName(x.label)}`).join("; ")}.`);
  sections.push({ key: "pipeline", title: "The pipeline", lines: pipeline });

  /* ---------------- campaigns and visitors ---------------- */

  const reach: string[] = [];
  const camps = data.campaigns.filter((x) => x.leads > 0).slice(0, 3);
  reach.push(
    camps.length === 0
      ? "No leads came from campaigns in this period."
      : `Leading campaigns: ${camps
          .map((x) => `${label(x.name)}, with ${count(x.leads, "lead")}${x.won ? `, ${fmt(x.won)} won` : ""}`)
          .join("; ")}.`
  );

  const srcs = data.sources.filter((x) => x.visitors > 0).slice(0, 3);
  reach.push(
    srcs.length === 0
      ? "No website visits were recorded."
      : `Most visitors came from ${srcs
          .map(
            (x) =>
              `${label(x.source) || "unknown"}, ${count(x.visitors, "visitor")}${
                x.conversions ? ` and ${count(x.conversions, "enquiry", "enquiries")}` : ""
              }`
          )
          .join("; ")}.`
  );

  // The busiest moment, which is the one thing a chart shows that a total does not.
  const peak = (key: "visitors" | "leads") => {
    let best: (typeof data.series)[number] | null = null;
    for (const point of data.series) if (point[key] > (best ? best[key] : 0)) best = point;
    return best;
  };
  const busy = peak("visitors");
  if (busy) {
    const when = hourly ? spokenTime(`${busy.day.slice(0, 10)}T${busy.day.slice(11, 16) || "00:00"}`) : spokenDate(busy.day);
    if (when) reach.push(`Website traffic ${hourly ? "peaked at" : "was busiest on"} ${when}, with ${count(busy.visitors, "visitor")}.`);
  }
  const busyLeads = peak("leads");
  if (busyLeads) {
    const when = hourly
      ? spokenTime(`${busyLeads.day.slice(0, 10)}T${busyLeads.day.slice(11, 16) || "00:00"}`)
      : spokenDate(busyLeads.day);
    if (when) reach.push(`New leads ${hourly ? "peaked at" : "were highest on"} ${when}, with ${fmt(busyLeads.leads)}.`);
  }
  sections.push({ key: "reach", title: "Campaigns and visitors", lines: reach });

  /* ---------------- the team ---------------- */

  const team: string[] = [];
  if (data.team.length === 0) {
    team.push("There is nobody on the team to report on.");
  } else {
    team.push(`Here is each person's work, for ${now}.`);
    for (const person of data.team) team.push(describePerson(person, roleLabel));
  }
  sections.push({ key: "team", title: "The team", lines: team });

  /* ---------------- daily reports ---------------- */

  sections.push({ key: "reports", title: "Daily reports", lines: describeReports(data.reports) });

  /* ---------------- activity ---------------- */

  const activity = describeActivity(data.activity);
  activity.push("That is the end of the report.");
  sections.push({ key: "activity", title: "Activity on leads", lines: activity });

  return sections;
}

function describePerson(p: ExecPerson, roleLabel: (role: ExecPerson["role"]) => string): string {
  const out: string[] = [`${say(p.name) || "Someone"}, ${roleLabel(p.role)}.`];

  if (p.actions === 0 && p.new_leads === 0 && p.tasks_done === 0 && p.won === 0 && p.wa_sent === 0) {
    out.push("No recorded activity in this period.");
  } else {
    const detail: string[] = [];
    if (p.stage_moves > 0) detail.push(count(p.stage_moves, "stage move"));
    if (p.notes > 0) detail.push(count(p.notes, "note"));
    if (p.actions > 0) {
      out.push(`Recorded ${count(p.actions, "action")} on leads${detail.length ? `, with ${list(detail)}` : ""}.`);
    }
    if (p.won > 0) out.push(`${count(p.won, "deal")} won.`);
    if (p.new_leads > 0) out.push(`${count(p.new_leads, "new lead")} assigned.`);
    if (p.wa_sent > 0) out.push(`Sent ${count(p.wa_sent, "WhatsApp message")}.`);
    if (p.tasks_done > 0) out.push(`${count(p.tasks_done, "task")} completed.`);
  }

  if (p.open_leads > 0 || p.overdue_followups > 0) {
    out.push(
      `Holds ${count(p.open_leads, "open lead")}${p.overdue_followups > 0 ? `, ${fmt(p.overdue_followups)} with a late follow-up` : ""}.`
    );
  }
  if (p.tasks_open > 0) {
    out.push(`${count(p.tasks_open, "task")} open${p.tasks_overdue > 0 ? `, ${fmt(p.tasks_overdue)} overdue` : ""}.`);
  }

  const inAt = spokenTime(p.today_in);
  out.push(inAt ? `Signed in today at ${inAt}.` : "Has not signed in today.");
  if (p.reports > 0) out.push(`Filed ${count(p.reports, "daily report")} in this period.`);
  else out.push("Filed no daily report in this period.");

  return out.join(" ");
}

function describeReports(reports: Workday[]): string[] {
  if (reports.length === 0) return ["Nobody has written a daily report in this period."];

  const blocked = reports.filter((r) => say(r.blockers ?? "") !== "");
  const stuck = blocked.filter((r) => !r.blocker_resolved_at);

  const out: string[] = [
    `${count(reports.length, "daily report")} ${reports.length === 1 ? "was" : "were"} filed in this period.`,
  ];
  if (blocked.length) {
    out.push(
      `${fmt(blocked.length)} mentioned a blocker, and ${stuck.length === 0 ? "all of those have been cleared" : `${fmt(stuck.length)} ${stuck.length === 1 ? "is" : "are"} still waiting`}.`
    );
  }

  // Reports with something still blocking come first: they are the ones that
  // need a decision, and a listener who stops early should have heard them.
  const ordered = [...stuck, ...reports.filter((r) => !stuck.includes(r))];
  const read = ordered.slice(0, MAX_REPORTS);

  for (const r of read) {
    const parts: string[] = [`${say(r.name ?? "") || "Someone"}, ${spokenDate(r.work_date)}.`];
    if (r.summary) parts.push(clip(r.summary));
    if (r.blockers && say(r.blockers)) {
      let line = `Blocked by: ${clip(r.blockers, 400)}`;
      if (r.blocker_owner_name) {
        line += r.blocker_resolved_at
          ? ` This was cleared by ${say(r.blocker_owner_name)}.`
          : ` Waiting on ${say(r.blocker_owner_name)}.`;
      }
      parts.push(line);
    }
    if (r.plan_tomorrow && say(r.plan_tomorrow)) parts.push(`Next: ${clip(r.plan_tomorrow, 400)}`);
    if (r.mood === "rough") parts.push("They called it a rough day.");
    out.push(parts.join(" "));
  }

  const left = reports.length - read.length;
  if (left > 0) {
    out.push(`${count(left, "more report")} ${left === 1 ? "is" : "are"} on screen, not read out.`);
  }
  return out;
}

const KIND: Record<string, [string, string]> = {
  status: ["stage move", "stage moves"],
  note: ["note", "notes"],
  note_edited: ["note edit", "note edits"],
  assigned: ["assignment", "assignments"],
  whatsapp: ["WhatsApp message", "WhatsApp messages"],
  email: ["email", "emails"],
  created: ["lead added", "leads added"],
};

function describeActivity(activity: ExecActivity[]): string[] {
  if (activity.length === 0) return ["There was no activity on leads in this period."];

  const byKind = new Map<string, number>();
  const byWho = new Map<string, number>();
  for (const a of activity) {
    byKind.set(a.type, (byKind.get(a.type) ?? 0) + 1);
    byWho.set(a.actor_name, (byWho.get(a.actor_name) ?? 0) + 1);
  }

  // Only kinds with a proper name are called out. Anything else is an internal
  // label ("task_added") that means nothing when spoken, so it joins "other".
  const known = [...byKind.entries()].filter(([type]) => KIND[type]).sort((a, b) => b[1] - a[1]);
  const shown = known.slice(0, 4).map(([type, n]) => count(n, KIND[type][0], KIND[type][1]));
  const other = activity.length - known.slice(0, 4).reduce((sum, [, n]) => sum + n, 0);
  if (other > 0) shown.push(count(other, "other change"));

  const out = [`There ${activity.length === 1 ? "was" : "were"} ${count(activity.length, "recorded change")} on leads: ${list(shown)}.`];

  const who = [...byWho.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (who.length > 1) {
    out.push(`Most active: ${who.map(([name, n]) => `${say(name)}, with ${fmt(n)}`).join("; ")}.`);
  }
  return out;
}

/* ---------------- turning the script into utterances ---------------- */

function sentences(line: string): string[] {
  return line.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
}

/** Breaks a long sentence at the most natural place inside the limit. */
function fit(sentence: string): string[] {
  const out: string[] = [];
  let rest = sentence;
  while (rest.length > MAX_CHUNK) {
    const window = rest.slice(0, MAX_CHUNK);
    let cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
    if (cut < 40) cut = window.lastIndexOf(" ");
    if (cut < 20) cut = MAX_CHUNK - 1;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * The script as a queue of short utterances.
 *
 * Short on purpose. Speech engines cope badly with long text, and short pieces
 * are what make pause, skip and speed changes possible at all: the player
 * moves between pieces rather than trying to interrupt one mid-word.
 */
export function toChunks(sections: BriefSection[]): BriefChunk[] {
  const out: BriefChunk[] = [];
  sections.forEach((section, index) => {
    out.push({ section: index, text: `${section.title}.` });
    for (const line of section.lines) {
      for (const sentence of sentences(line)) {
        for (const piece of fit(sentence)) out.push({ section: index, text: piece });
      }
    }
  });
  return out;
}

/** About how long it takes to hear, at ordinary pace, for the button to say so. */
export function listenMinutes(chunks: BriefChunk[], rate = 1): number {
  const words = chunks.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 155 / rate));
}

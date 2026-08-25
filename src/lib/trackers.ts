/**
 * Every productivity tracker, defined once.
 *
 * The WordPress plugin stores these generically — it owns only the columns
 * that have to be queryable (tracker, title, status, priority, owner, dates)
 * and keeps everything else as JSON. This file is what gives those records
 * meaning, so adding a ninth tracker is an entry here plus its key in
 * bsqf_tracker_keys(), not a migration.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "time"
  | "number"
  | "select"
  | "url"
  | "yesno";

/**
 * `column` marks a field that maps to a real database column rather than the
 * JSON blob. Those are the ones you can filter and sort by.
 */
export type TrackerColumn =
  | "title"
  | "status"
  | "priority"
  | "owner_name"
  | "entry_date"
  | "due_date";

export interface TrackerField {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  column?: TrackerColumn;
  /** Shown as a column in the list view. Everything else lives in the editor. */
  inTable?: boolean;
  placeholder?: string;
}

export interface TrackerDef {
  key: string;
  label: string;
  /** Sentence under the page title, so each screen explains itself. */
  blurb: string;
  statuses: readonly string[];
  fields: readonly TrackerField[];
}

/**
 * Statuses that mean "finished" anywhere in the system. Mirrors
 * bsqf_tracker_done_sql() in the plugin — if you add a terminal status to a
 * tracker below, add it to both or the open/overdue counts will disagree.
 */
export const DONE_STATUSES = [
  "Done",
  "Completed",
  "Sent",
  "Submitted",
  "Published",
  "Posted",
  "Closed",
  "Cancelled",
  "Archived",
  "Rejected",
] as const;

export const PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;

/** From the tracker's own priority guide, shown as help text on the field. */
export const PRIORITY_HINT: Record<string, string> = {
  Urgent: "Client, reputation or a critical deadline",
  High: "Important today",
  Medium: "Normal planned work",
  Low: "Improvement or optional work",
};

const DEPARTMENTS = ["Operations", "Sales", "Marketing", "Content", "Community", "Admin"] as const;

export const TRACKERS: readonly TrackerDef[] = [
  {
    key: "daily_ops",
    label: "Daily Ops",
    blurb: "Check in, log what you are working on, and close the day with an update.",
    statuses: ["Not Started", "In Progress", "Blocked", "Done"],
    fields: [
      { key: "title", label: "Priority / Task", type: "text", column: "title", inTable: true },
      { key: "entry_date", label: "Date", type: "date", column: "entry_date", inTable: true },
      { key: "checkin_time", label: "Check-in time", type: "time" },
      { key: "department", label: "Department", type: "select", options: DEPARTMENTS, inTable: true },
      { key: "assigned_by", label: "Assigned by", type: "text" },
      { key: "status", label: "Status", type: "select", column: "status", inTable: true },
      { key: "due_date", label: "Due date", type: "date", column: "due_date", inTable: true },
      { key: "completed_time", label: "Completed time", type: "time" },
      { key: "outcome", label: "Outcome / update", type: "textarea" },
      { key: "blocker", label: "Blocker / escalation", type: "textarea" },
      { key: "eod_sent", label: "EOD report sent", type: "yesno" },
    ],
  },
  {
    key: "tasks",
    label: "Tasks & Follow-ups",
    blurb: "Everything you owe someone, with what it is waiting on and when it is due.",
    statuses: ["Not Started", "In Progress", "Waiting", "Done", "Cancelled"],
    fields: [
      { key: "title", label: "Task / follow-up", type: "text", column: "title", inTable: true },
      { key: "entry_date", label: "Date added", type: "date", column: "entry_date" },
      { key: "department", label: "Department", type: "select", options: DEPARTMENTS, inTable: true },
      { key: "related", label: "Related lead / project", type: "text", inTable: true },
      { key: "owner_name", label: "Assigned to", type: "text", column: "owner_name", inTable: true },
      { key: "status", label: "Status", type: "select", column: "status", inTable: true },
      { key: "due_date", label: "Due date", type: "date", column: "due_date", inTable: true },
      { key: "priority", label: "Priority", type: "select", column: "priority", inTable: true },
      { key: "last_action", label: "Last action", type: "text" },
      { key: "next_action", label: "Next action", type: "text" },
      { key: "waiting_on", label: "Waiting on", type: "text" },
      { key: "completed_on", label: "Completion date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "social",
    label: "Social Media",
    blurb: "What went out, how it performed, and anything that needs following up.",
    statuses: ["Idea", "Drafted", "Scheduled", "Posted", "Cancelled"],
    fields: [
      { key: "title", label: "Post title / topic", type: "text", column: "title", inTable: true },
      { key: "entry_date", label: "Date", type: "date", column: "entry_date", inTable: true },
      {
        key: "channel",
        label: "Channel",
        type: "select",
        options: ["LinkedIn", "Instagram", "Facebook", "X", "TikTok", "YouTube", "WhatsApp"],
        inTable: true,
      },
      {
        key: "format",
        label: "Content format",
        type: "select",
        options: ["Carousel", "Single image", "Video", "Reel", "Text", "Story", "Article"],
      },
      { key: "owner_name", label: "Creator / owner", type: "text", column: "owner_name" },
      { key: "posted_time", label: "Posted time", type: "time" },
      { key: "link", label: "Post link", type: "url", placeholder: "https://" },
      { key: "status", label: "Status", type: "select", column: "status", inTable: true },
      { key: "reach", label: "Reach", type: "number", inTable: true },
      { key: "likes", label: "Likes", type: "number" },
      { key: "comments", label: "Comments", type: "number" },
      { key: "shares", label: "Shares", type: "number" },
      { key: "saves", label: "Saves", type: "number" },
      { key: "inquiries", label: "Leads / inquiries", type: "number", inTable: true },
      { key: "result", label: "Achievement / result", type: "text" },
      { key: "observation", label: "Observation", type: "textarea" },
      { key: "followup_needed", label: "Follow-up needed", type: "yesno" },
      { key: "followup_owner", label: "Follow-up owner", type: "text" },
      { key: "due_date", label: "Follow-up date", type: "date", column: "due_date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "community",
    label: "Community",
    blurb: "Member activity, who is warming up, and what should go to sales.",
    // The sheet has no status column; these four make the same records
    // filterable as open or finished without changing what you record.
    statuses: ["Logged", "Following up", "Handed off", "Closed"],
    fields: [
      { key: "title", label: "Member / prospect", type: "text", column: "title", inTable: true },
      { key: "entry_date", label: "Date", type: "date", column: "entry_date", inTable: true },
      {
        key: "activity",
        label: "Activity type",
        type: "select",
        options: ["Community setup", "Welcome", "Discussion", "Question", "Event", "Moderation", "Outreach"],
        inTable: true,
      },
      {
        key: "platform",
        label: "Platform / location",
        type: "select",
        options: ["WhatsApp", "LinkedIn", "Facebook", "Telegram", "In person", "Other"],
        inTable: true,
      },
      { key: "source", label: "Source", type: "text" },
      {
        key: "member_type",
        label: "Member type",
        type: "select",
        options: ["Business owner", "Operations manager", "Technician", "Student", "Other"],
      },
      { key: "action", label: "Action taken", type: "textarea" },
      { key: "response", label: "Engagement / response", type: "textarea" },
      { key: "status", label: "Status", type: "select", column: "status", inTable: true },
      { key: "warm_lead", label: "Warm lead", type: "yesno", inTable: true },
      { key: "handoff", label: "Sales handoff", type: "yesno" },
      { key: "due_date", label: "Follow-up date", type: "date", column: "due_date", inTable: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "webinar",
    label: "Webinar",
    blurb: "Each webinar from first idea through promotion, attendance and follow-up.",
    statuses: ["Idea", "Planned", "Approved", "Promoting", "Live", "Done", "Cancelled"],
    fields: [
      { key: "title", label: "Webinar / topic", type: "text", column: "title", inTable: true },
      { key: "entry_date", label: "Date logged", type: "date", column: "entry_date" },
      { key: "status", label: "Stage", type: "select", column: "status", inTable: true },
      { key: "audience", label: "Target audience", type: "text" },
      { key: "guest", label: "Guest", type: "text", inTable: true },
      { key: "due_date", label: "Event date", type: "date", column: "due_date", inTable: true },
      {
        key: "platform",
        label: "Platform",
        type: "select",
        options: ["Zoom", "Google Meet", "Microsoft Teams", "YouTube Live", "X Spaces", "Other"],
      },
      {
        key: "approval",
        label: "Approval status",
        type: "select",
        options: ["Pending", "Approved", "Rejected"],
        inTable: true,
      },
      { key: "reg_link", label: "Registration link", type: "url", placeholder: "https://" },
      {
        key: "promotion",
        label: "Promotion status",
        type: "select",
        options: ["Not started", "In progress", "Done"],
      },
      { key: "registrations", label: "Registrations", type: "number", inTable: true },
      { key: "attendance", label: "Attendance", type: "number", inTable: true },
      { key: "leads", label: "Leads identified", type: "number" },
      { key: "followup_done", label: "Follow-up completed", type: "yesno" },
      { key: "report", label: "Post-webinar report", type: "textarea" },
      { key: "next_action", label: "Next action", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing & Campaigns",
    blurb: "Campaign plans, what each one is meant to achieve, and what it actually did.",
    statuses: ["Idea", "Planned", "Running", "Paused", "Done", "Cancelled"],
    fields: [
      { key: "title", label: "Campaign / project", type: "text", column: "title", inTable: true },
      { key: "entry_date", label: "Date logged", type: "date", column: "entry_date" },
      { key: "objective", label: "Objective", type: "textarea" },
      { key: "audience", label: "Target audience", type: "text" },
      { key: "offer", label: "Message / offer", type: "textarea" },
      {
        key: "channel",
        label: "Channel",
        type: "select",
        options: ["LinkedIn", "Instagram", "Facebook", "Email", "WhatsApp", "Website", "Offline"],
        inTable: true,
      },
      { key: "cta", label: "Call to action", type: "text" },
      { key: "owner_name", label: "Owner", type: "text", column: "owner_name", inTable: true },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "due_date", label: "End date", type: "date", column: "due_date", inTable: true },
      { key: "status", label: "Status", type: "select", column: "status", inTable: true },
      { key: "metric", label: "Metric", type: "text" },
      { key: "result", label: "Result", type: "text", inTable: true },
      { key: "learning", label: "Learning / recommendation", type: "textarea" },
      { key: "next_action", label: "Next action", type: "text" },
    ],
  },
  {
    key: "reports",
    label: "Reports Log",
    blurb: "Every report you send, what it concluded, and what it asked for next.",
    statuses: ["Draft", "Submitted"],
    fields: [
      {
        key: "title",
        label: "Report type",
        type: "select",
        column: "title",
        options: ["Daily", "Weekly", "Monthly", "Campaign", "Webinar", "Ad hoc"],
        inTable: true,
      },
      { key: "entry_date", label: "Report date", type: "date", column: "entry_date", inTable: true },
      { key: "period", label: "Period covered", type: "text", inTable: true },
      { key: "submitted_to", label: "Submitted to", type: "text", inTable: true },
      { key: "status", label: "Status", type: "select", column: "status", inTable: true },
      { key: "outcome", label: "Key outcome", type: "textarea" },
      { key: "blocker", label: "Main blocker", type: "textarea" },
      { key: "recommendation", label: "Recommendation", type: "textarea" },
      { key: "next_priority", label: "Next priority", type: "text" },
      { key: "link", label: "Report link / file", type: "url", placeholder: "https://" },
    ],
  },
  {
    key: "ideas",
    label: "Idea Log",
    blurb: "Suggestions worth raising, what problem each solves, and where it got to.",
    statuses: ["Proposed", "Approved", "In Progress", "Done", "Rejected"],
    fields: [
      { key: "title", label: "Idea", type: "text", column: "title", inTable: true },
      { key: "entry_date", label: "Date", type: "date", column: "entry_date", inTable: true },
      { key: "function", label: "Function", type: "select", options: DEPARTMENTS, inTable: true },
      { key: "problem", label: "Problem / opportunity", type: "textarea" },
      { key: "expected", label: "Expected result", type: "textarea" },
      { key: "effort", label: "Effort", type: "select", options: ["Low", "Medium", "High"], inTable: true },
      { key: "approval_needed", label: "Approval needed", type: "yesno" },
      { key: "status", label: "Status", type: "select", column: "status", inTable: true },
      { key: "next_step", label: "Next step", type: "text" },
      { key: "owner_name", label: "Owner", type: "text", column: "owner_name", inTable: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
];

export function getTracker(key: string): TrackerDef | undefined {
  return TRACKERS.find((t) => t.key === key);
}

export function isDone(status: string): boolean {
  return (DONE_STATUSES as readonly string[]).includes(status);
}

/** A record is overdue only if it is both past its date and still open. */
export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || isDone(status)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

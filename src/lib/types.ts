export type Role = "superadmin" | "admin" | "subadmin";

/** Both admin tiers see the whole CRM; only what they can administer differs. */
export function isAdminRole(role: Role): boolean {
  return role === "superadmin" || role === "admin";
}

/**
 * Who may create, change or delete an account at a given level. A super admin
 * manages anyone; an admin manages sub-admins only. The plugin enforces this
 * too — hiding a button is convenience, not the check.
 */
export function canManageRole(actor: Role, target: Role): boolean {
  if (actor === "superadmin") return true;
  if (actor === "admin") return target === "subadmin";
  return false;
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  subadmin: "Sub-admin",
};

/** A website whose enquiries land in this CRM. */
export interface Site {
  id: number;
  name: string;
  url: string;
  status: "active" | "revoked";
  created_at: string;
  last_seen_at: string | null;
  leads: number;
}
export type UserStatus = "invited" | "active" | "disabled";

/**
 * A stage key. Deliberately a plain string rather than a union: the pipeline
 * is configurable in WordPress, so the set of valid values is not knowable at
 * compile time. Anything that needs to know what a stage *means* asks the
 * Pipeline object below rather than comparing against a literal.
 */
export type LeadStatus = string;

export interface Stage {
  key: LeadStatus;
  label: string;
  /** Chance of closing from here, 0–100. What makes a forecast weighted. */
  probability: number;
  colour: string;
  type: "open" | "won" | "lost";
}

export interface Pipeline {
  stages: Stage[];
  won_key: string;
  lost_key: string;
  /** Keys that still count as in play. */
  open: string[];
}

/**
 * Mirrors bsqf_default_stages() in the plugin. Used only when /stages cannot
 * be reached, so the board still draws columns instead of looking empty.
 */
export const DEFAULT_PIPELINE: Pipeline = {
  stages: [
    { key: "new", label: "New Inquiry / Lead", probability: 5, colour: "#64748b", type: "open" },
    { key: "contacted", label: "Contacted", probability: 10, colour: "#2f6f8f", type: "open" },
    { key: "qualification", label: "Qualification", probability: 15, colour: "#1665c1", type: "open" },
    { key: "tech_discussion", label: "Technical Discussion / Spec Confirmation", probability: 30, colour: "#0e7490", type: "open" },
    { key: "quotation_sent", label: "Quotation Sent", probability: 45, colour: "#4f46e5", type: "open" },
    { key: "negotiation", label: "Negotiation", probability: 60, colour: "#7c3aed", type: "open" },
    { key: "deposit", label: "Deposit / PO Received", probability: 80, colour: "#b45309", type: "open" },
    { key: "production", label: "Sourcing / Production in China", probability: 90, colour: "#c2410c", type: "open" },
    { key: "shipping", label: "Shipping", probability: 95, colour: "#9a3412", type: "open" },
    { key: "customs", label: "Customs Clearance (Nigeria)", probability: 97, colour: "#0f766e", type: "open" },
    { key: "delivery", label: "Delivery / Installation", probability: 99, colour: "#15803d", type: "open" },
    { key: "won", label: "Won (After-sales)", probability: 100, colour: "#3a7a12", type: "won" },
    { key: "lost", label: "Lost", probability: 0, colour: "#a83232", type: "lost" },
  ],
  won_key: "won",
  lost_key: "lost",
  open: [
    "new", "contacted", "qualification", "tech_discussion", "quotation_sent",
    "negotiation", "deposit", "production", "shipping", "customs", "delivery",
  ],
};

/** Convenience wrapper so pages ask questions instead of comparing strings. */
export function stageOf(pipeline: Pipeline, key: LeadStatus): Stage | undefined {
  return pipeline.stages.find((s) => s.key === key);
}

export function stageLabel(pipeline: Pipeline, key: LeadStatus): string {
  return stageOf(pipeline, key)?.label ?? key;
}

export function isClosed(pipeline: Pipeline, key: LeadStatus): boolean {
  const s = stageOf(pipeline, key);
  return s ? s.type !== "open" : false;
}

/**
 * Weighted count: each open lead counts for its stage's probability. With no
 * deal values yet this forecasts how many of the open leads should close, not
 * how much they are worth — the money arrives with the Deals object.
 */
export function weightedOpen(
  pipeline: Pipeline,
  byStatus: Partial<Record<string, number>>
): number {
  let total = 0;
  for (const s of pipeline.stages) {
    if (s.type !== "open") continue;
    total += (byStatus[s.key] ?? 0) * (s.probability / 100);
  }
  return Math.round(total * 10) / 10;
}

/**
 * What a sub-admin can individually be granted. An admin has every one of
 * these implicitly — the plugin never restricts an admin row by this list.
 */
export type Permission =
  | "send_email"
  | "send_whatsapp"
  | "add_leads"
  | "import_leads"
  | "delete_leads";

export const PERMISSIONS: { key: Permission; label: string; hint: string }[] = [
  { key: "send_email", label: "Send email to leads", hint: "Compose and send from a lead's page or in bulk" },
  { key: "send_whatsapp", label: "Message leads on WhatsApp", hint: "Open the shared WhatsApp conversation" },
  { key: "add_leads", label: "Add leads manually", hint: "Enter a lead by hand" },
  { key: "import_leads", label: "Import leads from a file", hint: "Upload a CSV or Excel sheet" },
  { key: "delete_leads", label: "Delete leads", hint: "Permanent, with no way to undo it — leave this off unless they need it" },
];

/**
 * Granted only when someone deliberately ticks it. Everything else is on by
 * default for a new sub-admin; deleting a lead destroys its notes and history
 * with no trash to recover from, so it starts off.
 */
export const DESTRUCTIVE_PERMISSIONS: Permission[] = ["delete_leads"];

export interface DashUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  capacity: number;
  /** Accounts created before this existed carry every permission, not none. */
  permissions: Permission[];
  created_at: string;
  last_login_at: string | null;
}

export function hasPermission(user: DashUser | null, key: Permission): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes(key);
}

export interface Lead {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string;
  payload: string | null;
  source_url: string;
  status: LeadStatus;
  assigned_to: number | null;
  assigned_at: string | null;
  next_action_at: string | null;
  /**
   * When anything last happened on this lead — a status change, a note, an
   * email, a WhatsApp open. Null only for a lead written before the plugin
   * tracked it, which is why nothing treats null as "silent forever".
   */
  last_activity_at: string | null;
  /** Which website the enquiry came from. Null means this CRM's own site. */
  site_id: number | null;
  site_name: string | null;
  /** Only ever set while the lead sits in the Lost stage; cleared on reopen. */
  lost_reason: string;
}

/**
 * How long a lead has been quiet, in whole days, or null when it has never
 * had activity recorded. Counted against the server's clock rather than the
 * browser's, so a laptop with the wrong date cannot invent stale leads.
 */
export function daysQuiet(
  lastActivityAt: string | null,
  /** MySQL datetime from the list endpoint, or unix seconds from the lead endpoint. */
  serverNow: string | number
): number | null {
  if (!lastActivityAt) return null;
  const then = Date.parse(lastActivityAt.replace(" ", "T"));
  const now = typeof serverNow === "number" ? serverNow * 1000 : Date.parse(serverNow.replace(" ", "T"));
  if (isNaN(then) || isNaN(now)) return null;
  return Math.max(0, Math.floor((now - then) / 86400000));
}

export function isStale(
  lead: { last_activity_at: string | null; status: LeadStatus },
  serverNow: string | number,
  staleAfterDays: number
): boolean {
  // A closed lead going quiet is the desired outcome, not a problem. And a
  // threshold of zero means the whole feature is switched off.
  if (staleAfterDays <= 0) return false;
  if (lead.status === "won" || lead.status === "lost") return false;
  const quiet = daysQuiet(lead.last_activity_at, serverNow);
  return quiet !== null && quiet > staleAfterDays;
}

export interface LeadRow extends Lead {
  owner: string | null;
  /** Null when the campaign form has since been deleted — the lead survives it. */
  form_id: number | null;
  form_name: string | null;
  unsubscribed: boolean;
}

export interface LeadEmail {
  id: number;
  campaign_id: number;
  subject: string;
  status: "pending" | "sent" | "failed";
  error: string;
  sent_at: string | null;
  sent_by: string;
}

export type FormMode = "modal" | "inline" | "manual";

export interface Campaign {
  id: number;
  name: string;
  mode: FormMode;
  status: string;
  created_at: string;
  leads: number;
  won: number;
  conversion: number;
}

export interface CampaignDetail {
  id: number;
  name: string;
  mode: FormMode;
  status: string;
  fields: { key: string; label: string; type: string }[];
  byStatus: Partial<Record<LeadStatus, number>>;
  leads: number;
  won: number;
  conversion: number;
}

/** One answer as it was worded at submission time. */
export interface PayloadRow {
  k: string;
  label: string;
  value: string;
}

export interface Note {
  id: number;
  lead_id: number;
  author_id: number | null;
  author_name: string;
  body: string;
  created_at: string;
  /** Set once the author has changed it, so the card can say so. */
  updated_at: string | null;
  /** Unix seconds. Compare against the `now` on the same response, not the
   *  browser clock, which can be well out. The server re-checks on write. */
  editable_until: number;
}

/**
 * Sticky-note colours, assigned per author rather than at random so the same
 * person's notes always look the same and you can tell at a glance who wrote
 * what on a busy lead.
 */
export const NOTE_COLORS = ["butter", "mint", "sky", "rose", "lilac", "peach"] as const;

export function noteColor(note: Note): string {
  // Falls back to the name when a note predates author ids. A plain character
  // sum ignores order and collides readily on short names, so this mixes
  // position in — "peace" and "brandsquare" should not land on one colour.
  const seed =
    note.author_id ??
    Array.from(note.author_name).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
  return NOTE_COLORS[Math.abs(seed) % NOTE_COLORS.length];
}

export interface Activity {
  id: number;
  lead_id: number;
  actor_id: number | null;
  actor_name: string;
  type: string;
  from_value: string;
  to_value: string;
  created_at: string;
}

/* ---------------- email marketing ---------------- */

export interface EmailBlocks {
  header_text: string;
  header_bg: string;
  header_color: string;
  body_html: string;
  body_bg: string;
  body_color: string;
  accent: string;
  cta_label: string;
  cta_url: string;
  footer_text: string;
  footer_bg: string;
  footer_color: string;
}

export interface EmailSettings {
  from_email: string;
  from_name: string;
  reply_to: string;
  smtp_enabled: number;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: string;
  smtp_user: string;
  smtp_pass: string;
  batch_size: number;
  blocks_default: EmailBlocks;
}

export type EmailStatus = "draft" | "sending" | "sent" | "failed";

export interface EmailCampaignRow {
  id: number;
  subject: string;
  status: EmailStatus;
  total: number;
  sent: number;
  failed: number;
  created_by: string;
  created_at: string;
  finished_at: string | null;
  audience: string;
  form_id: number | null;
}

export interface EmailRecipient {
  id: number;
  lead_id: number | null;
  email: string;
  name: string;
  status: "pending" | "sent" | "failed";
  error: string;
  sent_at: string | null;
}

export interface EmailCampaignDetail extends EmailCampaignRow {
  blocks: EmailBlocks;
  started_at: string | null;
  byStatus: Partial<Record<string, number>>;
  recipients: EmailRecipient[];
}

export interface AudiencePreview {
  count: number;
  sample: { name: string; email: string }[];
}

/* ---------------- manual add / import ---------------- */

export interface LeadAnswer {
  label: string;
  value: string;
}

export interface BulkLeadRow {
  name?: string;
  email?: string;
  phone?: string;
  answers?: LeadAnswer[];
  status?: LeadStatus;
  assigned_to?: number;
  /** True only for a manual single-add where the operator wants it left open. */
  unassigned?: boolean;
  note?: string;
  source?: string;
}

export interface BulkImportResult {
  created: number;
  skipped: { row: number; reason: string }[];
  campaign_id: number | null;
  campaign_name: string | null;
}

/* ---------------- productivity trackers ---------------- */

/**
 * One row in any tracker. The named columns are the ones the plugin can
 * filter and sort on; everything a particular tracker adds lives in `data`,
 * keyed by the field keys in lib/trackers.ts.
 */
export interface TrackerRecord {
  id: number;
  tracker: string;
  title: string;
  status: string;
  priority: string;
  owner_id: number | null;
  owner_name: string;
  entry_date: string | null;
  due_date: string | null;
  data: Record<string, string>;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface TrackerCounts {
  total: number;
  open: number;
  overdue: number;
}

export function parsePayload(raw: string | null): PayloadRow[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}


/* ---------------- analytics ---------------- */

export interface AnalyticsTotals {
  views: number;
  visitors: number;
  sessions: number;
  conversions: number;
  /** Conversions as a percentage of pageviews. */
  rate: number;
  avg_seconds: number;
  avg_scroll: number;
}

export interface PageStat {
  path: string;
  title: string;
  views: number;
  visitors: number;
  conversions: number;
  rate: number;
  avg_seconds: number;
  avg_scroll: number;
  bounce_rate: number;
}

export interface SourceStat {
  source: string;
  campaign: string;
  views: number;
  conversions: number;
  rate: number;
}

export interface DayStat {
  day: string;
  views: number;
  visitors: number;
  conversions: number;
}

export interface Analytics {
  days: number;
  totals: AnalyticsTotals;
  pages: PageStat[];
  sources: SourceStat[];
  daily: DayStat[];
  devices: { device: string; views: number; conversions: number }[];
}

export interface Heatmap {
  path: string;
  days: number;
  points: { x: number; y: number; w: number }[];
  elements: { selector: string; label: string; clicks: number }[];
  /** Visits grouped by how far down they reached, in 10% bands. */
  depth: { band: number; visits: number }[];
}

/** Seconds as something readable at a glance — "1m 40s" beats "100". */
export function humanSeconds(s: number): string {
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? m + "m " + r + "s" : m + "m";
}


/* ---------------- tasks and files ---------------- */

export interface Task {
  id: number;
  lead_id: number;
  title: string;
  due_at: string | null;
  /** Null while still outstanding. */
  done_at: string | null;
  created_by_name: string;
  created_at: string;
}

export interface LeadFile {
  id: number;
  name: string;
  url: string;
  mime: string;
  size_bytes: number;
  uploaded_by_name: string;
  created_at: string;
}

/** File sizes people can read — "1.4 MB" rather than 1468006. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export type Role = "admin" | "subadmin";
export type UserStatus = "invited" | "active" | "disabled";

export type LeadStatus =
  | "new"
  | "assigned"
  | "contacted"
  | "qualified"
  | "won"
  | "lost";

export const LEAD_STATUSES: { key: LeadStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export const OPEN_STATUSES: LeadStatus[] = ["new", "assigned", "contacted", "qualified"];

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

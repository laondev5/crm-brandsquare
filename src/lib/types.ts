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

export interface DashUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  capacity: number;
  created_at: string;
  last_login_at: string | null;
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

export function parsePayload(raw: string | null): PayloadRow[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

import "server-only";
import { api } from "./api";
import type {
  Activity,
  AudiencePreview,
  BulkImportResult,
  BulkLeadRow,
  Campaign,
  CampaignDetail,
  DashUser,
  EmailBlocks,
  EmailCampaignDetail,
  EmailCampaignRow,
  EmailSettings,
  LeadEmail,
  LeadRow,
  Note,
  LeadStatus,
  Permission,
} from "./types";

/**
 * Every read and write goes through the plugin's REST API. This file is the
 * only place that knows that — pages and actions just call these functions.
 */

/* ---------------- leads ---------------- */

export interface LeadFilter {
  status?: string;
  search?: string;
  /** A sub-admin's own id. Sent to the server, which puts it in the WHERE
   *  clause — scope is never a UI concern. */
  ownerId?: number | null;
  /** Narrow to one campaign form. */
  formId?: number | null;
  page?: number;
  perPage?: number;
}

export async function listLeads(f: LeadFilter) {
  return api.get<{ rows: LeadRow[]; total: number; pages: number; page: number }>("/leads", {
    status: f.status,
    s: f.search,
    owner: f.ownerId ?? undefined,
    form: f.formId ?? undefined,
    page: f.page ?? 1,
    per: f.perPage ?? 20,
  });
}

/* ---------------- campaigns ---------------- */

export async function listCampaigns(page = 1, per = 20) {
  return api.get<{ rows: Campaign[]; total: number; pages: number; page: number }>("/forms", {
    page,
    per,
  });
}

export async function getCampaign(id: number) {
  try {
    return await api.get<CampaignDetail>(`/forms/${id}`);
  } catch {
    return null;
  }
}

export async function getLeadFull(id: number, ownerId?: number | null) {
  try {
    return await api.get<{ lead: LeadRow; notes: Note[]; activity: Activity[] }>(`/leads/${id}`, {
      owner: ownerId ?? undefined,
    });
  } catch {
    return null;
  }
}

export interface LeadUpdate {
  status?: LeadStatus;
  assigned_to?: number | null;
  next_action_at?: string | null;
}

export async function updateLead(
  id: number,
  actor: DashUser,
  patch: LeadUpdate,
  ownerId?: number | null
) {
  await api.patch(`/leads/${id}`, {
    ...patch,
    actor_id: actor.id,
    actor_name: actor.name,
    owner: ownerId ?? undefined,
  });
}

export async function addNote(id: number, actor: DashUser, body: string) {
  await api.post(`/leads/${id}/notes`, {
    body,
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

/* ---------------- team ---------------- */

export type TeamMember = DashUser & { open_leads: number };

export async function listTeam() {
  const res = await api.get<{ users: TeamMember[] }>("/users");
  return res.users;
}

export async function allSubadmins() {
  const res = await api.get<{ users: DashUser[] }>("/users", { scope: "subadmins" });
  return res.users;
}

export async function createSubadmin(input: {
  email: string;
  name: string;
  capacity: number;
  createdBy: number;
  permissions: Permission[];
}) {
  return api.post<{ id: number; invite_token: string; temp_password: string }>("/users", {
    email: input.email,
    name: input.name,
    role: "subadmin",
    capacity: input.capacity,
    created_by: input.createdBy,
    permissions: input.permissions,
  });
}

export async function setUserStatus(id: number, status: "active" | "disabled") {
  await api.patch(`/users/${id}`, { status });
}

export async function updateSubadmin(
  id: number,
  patch: { name?: string; email?: string; capacity?: number; permissions?: Permission[] }
) {
  await api.patch(`/users/${id}`, patch);
}

/** Deletes the account and spreads their leads across whoever is left. */
export async function deleteSubadmin(id: number, actor: DashUser) {
  return api.del<{ ok: boolean; reassigned: number; heirs: number; name: string }>(
    `/users/${id}`,
    { actor_id: actor.id, actor_name: actor.name }
  );
}

/* ---------------- email marketing ---------------- */

export async function getEmailSettings() {
  return api.get<EmailSettings>("/email/settings");
}

export async function saveEmailSettings(patch: Partial<EmailSettings>) {
  await api.patch("/email/settings", patch);
}

/**
 * Reachable count, not raw lead count — the server excludes anyone
 * unsubscribed or without an address, and de-duplicates repeat enquirers.
 */
export async function audiencePreview(opts: {
  type: "all" | "form" | "selected";
  formId?: number | null;
  ids?: number[];
  ownerId?: number | null;
}) {
  return api.get<AudiencePreview>("/email/audience", {
    type: opts.type,
    form: opts.formId ?? undefined,
    ids: opts.ids?.length ? opts.ids.join(",") : undefined,
    owner: opts.ownerId ?? undefined,
  });
}

export async function listEmailCampaigns(page = 1, ownerId?: number | null) {
  return api.get<{ rows: EmailCampaignRow[]; total: number; pages: number; page: number }>(
    "/email/campaigns",
    { page, per: 20, owner: ownerId ?? undefined }
  );
}

export async function getEmailCampaign(id: number) {
  try {
    return await api.get<EmailCampaignDetail>(`/email/campaigns/${id}`);
  } catch {
    return null;
  }
}

export async function createEmailCampaign(input: {
  subject: string;
  blocks: EmailBlocks;
  audienceType: "all" | "form" | "selected";
  formId?: number | null;
  ids?: number[];
  ownerId?: number | null;
  send: boolean;
  actor: DashUser;
}) {
  return api.post<{ id: number; audience: number; queued: number }>("/email/campaigns", {
    subject: input.subject,
    blocks: input.blocks,
    audience_type: input.audienceType,
    audience_form_id: input.formId ?? 0,
    audience_ids: input.ids ?? [],
    owner: input.ownerId ?? 0,
    send: input.send,
    actor_id: input.actor.id,
    actor_name: input.actor.name,
  });
}

/* ---------------- manual add / import ---------------- */

/**
 * Shared by a single manual add (one-row array) and a CSV/Excel import
 * (many). ownerId set means "force every row to this sub-admin" — the only
 * form self-assignment takes, since a sub-admin cannot hand a lead to anyone
 * else.
 */
export async function bulkCreateLeads(input: {
  rows: BulkLeadRow[];
  formId?: number | null;
  formName?: string;
  selfAssignTo?: number | null;
  actor: DashUser;
  /** Which permission the plugin checks for a sub-admin actor. */
  context: "manual" | "import";
}) {
  return api.post<BulkImportResult>("/leads/bulk", {
    rows: input.rows,
    form_id: input.formId ?? 0,
    form_name: input.formName ?? "",
    self_assign_to: input.selfAssignTo ?? 0,
    actor_id: input.actor.id,
    actor_name: input.actor.name,
    context: input.context,
  });
}

/* ---------------- WhatsApp ---------------- */

/** Records that someone opened the shared WhatsApp thread for this lead —
 *  the CRM never sees the message itself, only that contact happened. */
export async function logWhatsAppOpen(leadId: number, actor: DashUser, ownerId?: number | null) {
  return api.post<{ ok: boolean }>(`/leads/${leadId}/whatsapp-open`, {
    actor_id: actor.id,
    actor_name: actor.name,
    owner: ownerId ?? undefined,
  });
}

/* ---------------- per-lead email ---------------- */

export async function getLeadEmails(leadId: number, ownerId?: number | null) {
  try {
    const res = await api.get<{ emails: LeadEmail[] }>(`/leads/${leadId}/emails`, {
      owner: ownerId ?? undefined,
    });
    return res.emails;
  } catch {
    return [];
  }
}

export async function sendLeadEmail(input: {
  leadId: number;
  subject: string;
  blocks: EmailBlocks;
  actor: DashUser;
  ownerId?: number | null;
}) {
  return api.post<{ id: number; audience: number; queued: number }>("/email/campaigns", {
    subject: input.subject,
    blocks: input.blocks,
    audience_type: "selected",
    audience_ids: [input.leadId],
    owner: input.ownerId ?? 0,
    send: true,
    actor_id: input.actor.id,
    actor_name: input.actor.name,
  });
}

/* ---------------- metrics ---------------- */

export interface Metrics {
  byStatus: Partial<Record<LeadStatus, number>>;
  total: number;
  today: number;
  overdue: number;
  unassigned: number;
  conversion: number;
  load: { id: number; name: string; open_leads: number; won: number }[];
}

export async function metrics(ownerId?: number | null) {
  return api.get<Metrics>("/metrics", { owner: ownerId ?? undefined });
}

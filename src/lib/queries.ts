import "server-only";
import { cache } from "react";
import { api } from "./api";
import { DEFAULT_PIPELINE } from "./types";
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
  Role,
  Site,
  Pipeline,
  TrackerCounts,
  TrackerRecord,
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
  /** Which connected website. "this" means the CRM's own site. */
  siteId?: number | "this" | null;
  /** Narrow to one campaign form. */
  formId?: number | null;
  page?: number;
  perPage?: number;
  /** "next" orders by follow-up date, soonest first. Default is newest-first. */
  sort?: "next";
}

export async function listLeads(f: LeadFilter) {
  return api.get<{
    rows: LeadRow[];
    total: number;
    pages: number;
    page: number;
    /** The threshold the server filtered on, so a badge cannot disagree with the tab. */
    stale_after_days: number;
    /** Server clock, so "quiet for 20 days" is not computed from the browser's. */
    now: string;
  }>("/leads", {
    status: f.status,
    s: f.search,
    owner: f.ownerId ?? undefined,
    form: f.formId ?? undefined,
    site: f.siteId ?? undefined,
    sort: f.sort,
    page: f.page ?? 1,
    per: f.perPage ?? 20,
  });
}

/* ---------------- connected websites ---------------- */

export interface SiteList {
  sites: Site[];
  /** The CRM's own website, whose leads carry no site id. */
  this_site: { name: string; url: string; leads: number };
}

export const listSites = cache(async (actor: DashUser): Promise<SiteList> => {
  return api.get<SiteList>("/sites", { actor_id: actor.id });
});

/**
 * Adds a website and returns its key. The key is stored hashed on the server,
 * so this response is the only time it can be read — the UI has to show it
 * once and say so.
 */
export async function createSite(actor: DashUser, name: string, url: string) {
  return api.post<{ id: number; name: string; url: string; site_key: string; hub_url: string }>(
    "/sites",
    { name, url, actor_id: actor.id }
  );
}

export async function updateSite(
  actor: DashUser,
  id: number,
  patch: { name?: string; url?: string; status?: "active" | "revoked" }
) {
  await api.patch(`/sites/${id}`, { ...patch, actor_id: actor.id });
}

export async function deleteSite(actor: DashUser, id: number) {
  return api.del<{ ok: boolean; name: string }>(`/sites/${id}`, { actor_id: actor.id });
}

/* ---------------- pipeline stages ---------------- */

/**
 * The stage list is configured in WordPress, so it is fetched rather than
 * declared here. Cached for the life of one request via React's cache(), which
 * matters because a single page can ask for it from the layout, the page and
 * two components — this way that is one HTTP call, not four.
 *
 * The fallback is the shipped default rather than an empty list: a pipeline
 * page with no columns would look like "you have no leads" rather than like a
 * failed request.
 */
export const getPipeline = cache(async (): Promise<Pipeline> => {
  try {
    return await api.get<Pipeline>("/stages");
  } catch {
    return DEFAULT_PIPELINE;
  }
});

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
    return await api.get<{
      lead: LeadRow;
      notes: Note[];
      activity: Activity[];
      /** Server clock in unix seconds, for the note edit window. */
      now: number;
      /** Days of silence that count as stale, 0 when the flag is switched off. */
      stale_after_days: number;
    }>(`/leads/${id}`, { owner: ownerId ?? undefined });
  } catch {
    return null;
  }
}

export async function updateNote(leadId: number, noteId: number, body: string, actor: DashUser) {
  await api.patch(`/leads/${leadId}/notes/${noteId}`, {
    body,
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export async function deleteNote(leadId: number, noteId: number, actor: DashUser) {
  await api.del(`/leads/${leadId}/notes/${noteId}`, {
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export interface LeadUpdate {
  status?: LeadStatus;
  assigned_to?: number | null;
  next_action_at?: string | null;
  /** Only honoured by the server while the lead is in the Lost stage. */
  lost_reason?: string;
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

/**
 * Permanent — the lead, its notes and its activity trail all go. Emails
 * already sent stay in the campaign record, unlinked. `ownerId` is the
 * sub-admin scope the rest of the lead calls use: the server puts it in the
 * WHERE clause, so someone else's lead is simply not found.
 */
export async function deleteLead(id: number, actor: DashUser, ownerId?: number | null) {
  return api.del<{ ok: boolean; id: number; name: string }>(`/leads/${id}`, {
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

/**
 * Creates a team member. `role` is sent explicitly and the server checks the
 * creator is allowed to hand it out — an admin cannot mint another admin by
 * posting a different role, which is why actor identity travels with every
 * one of these calls now.
 */
export async function createMember(input: {
  email: string;
  name: string;
  capacity: number;
  createdBy: number;
  permissions: Permission[];
  role?: Role;
}) {
  return api.post<{ id: number; invite_token: string; temp_password: string }>("/users", {
    email: input.email,
    name: input.name,
    role: input.role ?? "subadmin",
    capacity: input.capacity,
    created_by: input.createdBy,
    permissions: input.permissions,
  });
}

export async function setUserStatus(id: number, status: "active" | "disabled", actor: DashUser) {
  await api.patch(`/users/${id}`, { status, actor_id: actor.id });
}

export async function updateMember(
  id: number,
  patch: { name?: string; email?: string; capacity?: number; permissions?: Permission[]; role?: Role },
  actor: DashUser
) {
  await api.patch(`/users/${id}`, { ...patch, actor_id: actor.id });
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

/* ---------------- productivity trackers ---------------- */

export interface TrackerFilter {
  tracker: string;
  /** A real status, or the synthetic "open" / "overdue" the plugin understands. */
  status?: string;
  search?: string;
  ownerId?: number | null;
  page?: number;
  perPage?: number;
}

export async function listTrackerRecords(f: TrackerFilter) {
  return api.get<{ rows: TrackerRecord[]; total: number; pages: number; page: number }>("/tracker", {
    tracker: f.tracker,
    status: f.status || undefined,
    s: f.search || undefined,
    owner: f.ownerId ?? undefined,
    page: f.page ?? 1,
    per: f.perPage ?? 50,
  });
}

/** Counts for all eight trackers in one request, for the nav and dashboard. */
export async function trackerSummary(ownerId?: number | null) {
  const res = await api.get<{ summary: Record<string, TrackerCounts> }>("/tracker/summary", {
    owner: ownerId ?? undefined,
  });
  return res.summary ?? {};
}

export interface TrackerInput {
  tracker: string;
  title: string;
  status?: string;
  priority?: string;
  owner_id?: number | null;
  owner_name?: string;
  entry_date?: string | null;
  due_date?: string | null;
  data?: Record<string, string>;
}

export async function createTrackerRecord(input: TrackerInput, actor: DashUser) {
  return api.post<{ id: number }>("/tracker", {
    ...input,
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export async function updateTrackerRecord(
  id: number,
  patch: Partial<TrackerInput>,
  ownerId?: number | null
) {
  return api.patch<TrackerRecord>(`/tracker/${id}`, {
    ...patch,
    owner: ownerId ?? undefined,
  });
}

export async function deleteTrackerRecord(id: number, ownerId?: number | null) {
  await api.del(`/tracker/${id}`, { owner: ownerId ?? undefined });
}

/* ---------------- metrics ---------------- */

export interface Metrics {
  byStatus: Partial<Record<LeadStatus, number>>;
  total: number;
  today: number;
  overdue: number;
  unassigned: number;
  /** Open leads with no activity for longer than the threshold below. */
  stale: number;
  stale_after_days: number;
  conversion: number;
  load: { id: number; name: string; open_leads: number; won: number }[];
}

export async function metrics(ownerId?: number | null) {
  return api.get<Metrics>("/metrics", { owner: ownerId ?? undefined });
}

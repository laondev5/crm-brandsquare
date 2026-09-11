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
  Analytics,
  Heatmap,
  Task,
  LeadFile,
  SavedView,
  MessageTemplate,
  DuplicateMatch,
  PageSnapshot,
  WaConversation,
  WaThread,
  WaSettings,
  Site,
  Pipeline,
  Stage,
  LeadSort,
  MetaDataset,
  MetaEvent,
  Workday,
  TeamDay,
  WorkStage,
  Project,
  WorkTask,
  WorkOverview,
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
  /**
   * How to order the list. "next" is the agenda's own ordering (soonest
   * follow-up first) and is not offered as a user-facing choice; the rest are.
   * The server whitelists these — it will not accept a column name.
   */
  sort?: LeadSort | "next";
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
    /** Which ordering the server actually applied. */
    sort?: string;
    /**
     * Where this page starts in the whole result set. The list numbers its
     * rows 1..N from here, so row 21 on page 2 reads as 21 rather than
     * restarting at 1 — and the numbering follows whatever sort is applied
     * rather than being tied to the database id.
     */
    offset?: number;
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
  this_site: {
    name: string;
    url: string;
    leads: number;
    views: number;
    last_visit: string | null;
  };
  /**
   * False when the WordPress plugin on this hub predates traffic reporting.
   * The dashboard is deployed independently of the plugin, so it will always
   * be possible to be running a newer CRM against an older WordPress. When
   * that happens the traffic figures are simply absent from the response —
   * this flag lets the Websites page say so plainly instead of showing zeros
   * that look like a tracking fault, or failing on a missing field.
   */
  traffic_supported: boolean;
  /** The plugin version answering on the hub, so an upload can be confirmed
   *  from the dashboard instead of guessed at. Unknown on older plugins,
   *  which is itself the answer. */
  plugin_version: string | null;
}

/** The response as it arrives: every traffic field is optional, because an
 *  older plugin simply will not send it. */
type RawSiteList = {
  plugin_version?: string;
  sites?: (Omit<Site, "views" | "last_visit"> & { views?: number; last_visit?: string | null })[];
  this_site?: {
    name?: string;
    url?: string;
    leads?: number;
    views?: number;
    last_visit?: string | null;
  };
};

export const listSites = cache(async (actor: DashUser): Promise<SiteList> => {
  const res = (await api.get<RawSiteList>("/sites", { actor_id: actor.id })) ?? {};
  const own = res.this_site ?? {};

  return {
    traffic_supported: own.views !== undefined,
    plugin_version: res.plugin_version ?? null,
    sites: (res.sites ?? []).map((s) => ({
      ...s,
      views: Number(s.views ?? 0),
      last_visit: s.last_visit ?? null,
    })),
    this_site: {
      name: own.name ?? "This website",
      url: own.url ?? "",
      leads: Number(own.leads ?? 0),
      views: Number(own.views ?? 0),
      last_visit: own.last_visit ?? null,
    },
  };
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

/* ---------------- analytics ---------------- */

/**
 * Traffic figures are readable by everyone signed in — knowing which landing
 * page works is the whole team's business. Only the connection settings are
 * restricted to a super admin.
 */
export const getAnalytics = cache(
  async (days = 30, site: string | number = "all"): Promise<Analytics> => {
    return api.get<Analytics>("/analytics", { days, site });
  }
);

export async function getHeatmap(
  path: string,
  days = 30,
  site: string | number = "all"
): Promise<Heatmap> {
  return api.get<Heatmap>("/analytics/heatmap", { path, days, site });
}

/* ---------------- tasks and files ---------------- */

export async function addTask(leadId: number, title: string, dueAt: string, actor: DashUser) {
  return api.post<{ ok: boolean; id: number; tasks: Task[] }>(`/leads/${leadId}/tasks`, {
    title,
    due_at: dueAt,
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export async function updateTask(
  taskId: number,
  patch: { done?: boolean; title?: string; due_at?: string },
  actor: DashUser
) {
  return api.patch<{ ok: boolean; tasks: Task[] }>(`/tasks/${taskId}`, {
    ...patch,
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export async function deleteTask(taskId: number, actor: DashUser) {
  return api.del<{ ok: boolean; tasks: Task[] }>(`/tasks/${taskId}`, {
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export async function deleteLeadFile(fileId: number, actor: DashUser) {
  return api.del<{ ok: boolean; files: LeadFile[] }>(`/files/${fileId}`, {
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

/** Warns about a lead we already have, before the form is filled in. */
export async function checkDuplicate(email: string, phone: string) {
  return api.get<{ matches: { id: number; name: string; email: string; phone: string; status: string; created_at: string }[] }>(
    "/leads/check",
    { email, phone }
  );
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
/**
 * The pipeline to draw. A campaign may carry its own stages, so anything that
 * shows one campaign's leads should pass its id and get that campaign's
 * columns rather than the shared set.
 */
export const getPipeline = cache(async (formId?: number | null): Promise<Pipeline> => {
  try {
    return await api.get<Pipeline>("/stages", formId ? { form: formId } : undefined);
  } catch {
    return DEFAULT_PIPELINE;
  }
});

/** Replaces the shared pipeline every campaign falls back to. */
export async function saveStages(actor: DashUser, stages: Stage[]) {
  return api.post<Pipeline>("/stages", { stages, actor_id: actor.id });
}

/**
 * Replaces one campaign's pipeline, or hands it back to the shared one.
 *
 * The response carries `moved`: how many leads were sitting in a stage the new
 * list no longer has and were rehomed rather than left pointing at nothing.
 */
export async function saveFormStages(
  actor: DashUser,
  formId: number,
  stages: Stage[] | null
) {
  return api.post<Pipeline & { moved?: number }>(`/forms/${formId}/stages`, {
    actor_id: actor.id,
    ...(stages ? { stages } : { inherit: 1 }),
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
    return await api.get<{
      lead: LeadRow;
      notes: Note[];
      activity: Activity[];
      /** Server clock in unix seconds, for the note edit window. */
      now: number;
      /** Days of silence that count as stale, 0 when the flag is switched off. */
      stale_after_days: number;
      tasks: Task[];
      files: LeadFile[];
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
  company?: string;
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

export async function metrics(ownerId?: number | null, siteId?: number | "this" | null) {
  return api.get<Metrics>("/metrics", {
    owner: ownerId ?? undefined,
    site: siteId ?? undefined,
  });
}

/* ---------------- saved views ---------------- */

export const listViews = cache(async (): Promise<SavedView[]> => {
  const r = await api.get<{ views: SavedView[] }>("/views");
  return r.views ?? [];
});

export async function createView(actor: DashUser, name: string, query: string) {
  return api.post<{ ok: true; id: number }>("/views", { name, query, actor_id: actor.id });
}

export async function deleteView(id: number) {
  return api.del<{ ok: true }>(`/views/${id}`);
}

/* ---------------- message templates ---------------- */

export const listTemplates = cache(async (channel?: string): Promise<MessageTemplate[]> => {
  const r = await api.get<{ templates: MessageTemplate[] }>("/templates", { channel });
  return r.templates ?? [];
});

export async function createTemplate(input: {
  actor: DashUser;
  name: string;
  channel: string;
  subject: string;
  body: string;
}) {
  return api.post<{ ok: true; id: number }>("/templates", {
    name: input.name,
    channel: input.channel,
    subject: input.subject,
    body: input.body,
    actor_id: input.actor.id,
  });
}

export async function deleteTemplate(id: number) {
  return api.del<{ ok: true }>(`/templates/${id}`);
}

/* ---------------- acting on many leads at once ---------------- */

/**
 * The sub-admin scope is passed as `owner` exactly as it is for a single
 * lead: the plugin puts it in the WHERE clause for every id in turn, so a
 * selection that reaches beyond someone's own leads simply updates fewer
 * rows than were ticked rather than being refused outright.
 */
export async function bulkUpdateLeads(input: {
  ids: number[];
  actor: DashUser;
  status?: string;
  assignedTo?: number | null;
  ownerId?: number | null;
}) {
  return api.post<{ ok: true; updated: number }>("/leads/bulk-update", {
    ids: input.ids,
    status: input.status || undefined,
    assigned_to: input.assignedTo === undefined ? undefined : input.assignedTo,
    actor_id: input.actor.id,
    actor_name: input.actor.name,
    owner: input.ownerId ?? undefined,
  });
}

/* ---------------- duplicate detection ---------------- */

/**
 * Existing leads that share this email, or the tail of this phone number.
 * Wraps checkDuplicate with the typed shape and, more importantly, a failure
 * that returns nothing: a duplicate check that errors must never be able to
 * block someone adding a lead.
 */
export async function checkDuplicates(email: string, phone: string): Promise<DuplicateMatch[]> {
  if (!email && !phone) return [];
  try {
    const r = await checkDuplicate(email, phone);
    return (r.matches ?? []) as DuplicateMatch[];
  } catch {
    return [];
  }
}

/* ---------------- files on a lead ---------------- */

export async function uploadLeadFile(leadId: number, actor: DashUser, file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("actor_id", String(actor.id));
  form.append("actor_name", actor.name);
  return api.upload<{ ok: true; files: LeadFile[] }>(`/leads/${leadId}/files`, form);
}

/* ---------------- the page behind a heatmap ---------------- */

/**
 * The saved rendering of one page. Never throws: the heatmap is still worth
 * showing without its backdrop, so a missing or failed snapshot degrades to
 * the plain map rather than taking the screen down.
 */
export async function getSnapshot(
  path: string,
  site: string | number = "all",
  device = "desktop"
): Promise<PageSnapshot | null> {
  try {
    return await api.get<PageSnapshot>("/analytics/snapshot", { path, site, device });
  } catch {
    return null;
  }
}

/* ---------------- WhatsApp ---------------- */

export const getWaConversations = cache(async (search?: string) => {
  return api.get<{ conversations: WaConversation[]; configured: boolean; unread_total: number }>(
    "/whatsapp/conversations",
    { search }
  );
});

export const getWaThread = cache(async (id: number): Promise<WaThread> => {
  return api.get<WaThread>(`/whatsapp/conversations/${id}`);
});

export async function sendWaMessage(id: number, text: string, actor: DashUser) {
  return api.post<{ message: WaConversation }>(`/whatsapp/conversations/${id}/send`, {
    text,
    actor_id: actor.id,
    actor_name: actor.name,
  });
}

export async function markWaRead(id: number) {
  return api.post<{ ok: boolean }>(`/whatsapp/conversations/${id}/read`, {});
}

export async function getWaSettings(actor: DashUser): Promise<WaSettings> {
  return api.get<WaSettings>("/whatsapp/settings", { actor_id: actor.id });
}

export async function saveWaSettings(
  actor: DashUser,
  patch: {
    phone_number_id?: string;
    waba_id?: string;
    display_phone?: string;
    verify_token?: string;
    access_token?: string;
    app_secret?: string;
  }
): Promise<WaSettings> {
  return api.post<WaSettings>("/whatsapp/settings", { ...patch, actor_id: actor.id });
}

export async function verifyWaSettings(actor: DashUser) {
  return api.post<{ ok: boolean; display_phone_number: string; verified_name: string; quality_rating: string }>(
    "/whatsapp/settings/verify",
    { actor_id: actor.id }
  );
}

/** Fakes a customer message arriving. The plugin refuses this once a real
 *  Meta connection is configured, so it can only ever be a testing tool, not
 *  a way to plant a fabricated message in a live inbox. */
export async function simulateWaInbound(actor: DashUser, phone: string, text: string, name?: string) {
  return api.post<{ conversation: WaConversation }>("/whatsapp/simulate-inbound", {
    phone,
    text,
    name,
    actor_id: actor.id,
  });
}

/* ---------------- Meta Conversions API ---------------- */

export async function listMetaDatasets(actor: DashUser) {
  return api.get<{ datasets: MetaDataset[]; default_source: string; api_version: string }>(
    "/meta/datasets",
    { actor_id: actor.id }
  );
}

/** The access token is write-only: sent here, never read back. */
export async function createMetaDataset(
  actor: DashUser,
  body: Record<string, unknown>
) {
  return api.post<MetaDataset>("/meta/datasets", { ...body, actor_id: actor.id });
}

export async function updateMetaDataset(
  actor: DashUser,
  id: number,
  body: Record<string, unknown>
) {
  return api.patch<MetaDataset>(`/meta/datasets/${id}`, { ...body, actor_id: actor.id });
}

export async function deleteMetaDataset(actor: DashUser, id: number) {
  return api.del<{ ok: true }>(`/meta/datasets/${id}`, { actor_id: actor.id });
}

/** Sends one event immediately so the connection can be proved. */
export async function testMetaDataset(actor: DashUser, id: number) {
  return api.post<{ ok: true; trace: string; note: string }>(`/meta/datasets/${id}/test`, {
    actor_id: actor.id,
  });
}

export async function listMetaEvents(actor: DashUser, dataset?: number, per = 50) {
  return api.get<{ events: MetaEvent[] }>("/meta/events", {
    actor_id: actor.id,
    dataset: dataset ?? undefined,
    per,
  });
}

export async function flushMetaEvents(actor: DashUser) {
  return api.post<{ ok: true; sent: number; failed: number; error: string }>("/meta/flush", {
    actor_id: actor.id,
  });
}

export async function retryMetaEvents(actor: DashUser) {
  return api.post<{ ok: true; requeued: number; sent: number; failed: number; error: string }>(
    "/meta/retry",
    { actor_id: actor.id }
  );
}

/* ---------------- the working day ---------------- */

export async function getToday(actor: DashUser) {
  return api.get<{ day: string; workday: Workday | null; now: string }>("/workday/today", {
    actor_id: actor.id,
  });
}

export async function signIn(actor: DashUser) {
  return api.post<{ day: string; workday: Workday | null; now: string }>("/workday/sign-in", {
    actor_id: actor.id,
  });
}

/** Signing out is what records the day; the summary is required server-side. */
export async function signOut(
  actor: DashUser,
  body: { summary: string; blockers?: string; plan_tomorrow?: string; mood?: string }
) {
  return api.post<{ day: string; workday: Workday | null }>("/workday/sign-out", {
    ...body,
    actor_id: actor.id,
  });
}

export async function listWorkdays(actor: DashUser, date?: string) {
  return api.get<{ date: string; days: TeamDay[]; manager: boolean }>("/workdays", {
    actor_id: actor.id,
    date,
  });
}

export async function workdayHistory(actor: DashUser, user?: number, days = 14) {
  return api.get<{ history: Workday[] }>("/workday/history", {
    actor_id: actor.id,
    user,
    days,
  });
}

/* ---------------- projects and the board ---------------- */

export async function listProjects(actor: DashUser, status?: string) {
  return api.get<{ projects: Project[]; stages: WorkStage[] }>("/projects", {
    actor_id: actor.id,
    status,
  });
}

export async function saveProject(
  actor: DashUser,
  id: number | null,
  body: Record<string, unknown>
) {
  const payload = { ...body, actor_id: actor.id };
  return id
    ? api.patch<{ ok: true; id: number }>(`/projects/${id}`, payload)
    : api.post<{ ok: true; id: number }>("/projects", payload);
}

export async function deleteProject(actor: DashUser, id: number) {
  return api.del<{ ok: true }>(`/projects/${id}`, { actor_id: actor.id });
}

export async function listWorkTasks(
  actor: DashUser,
  opts: { project?: number; assigned?: number | "me" } = {}
) {
  return api.get<{ tasks: WorkTask[]; stages: WorkStage[] }>("/work-tasks", {
    actor_id: actor.id,
    project: opts.project,
    assigned: opts.assigned,
  });
}

export async function saveWorkTask(
  actor: DashUser,
  id: number | null,
  body: Record<string, unknown>
) {
  const payload = { ...body, actor_id: actor.id };
  return id
    ? api.patch<{ ok: true; task: WorkTask }>(`/work-tasks/${id}`, payload)
    : api.post<{ ok: true; task: WorkTask }>("/work-tasks", payload);
}

export async function deleteWorkTask(actor: DashUser, id: number) {
  return api.del<{ ok: true }>(`/work-tasks/${id}`, { actor_id: actor.id });
}

export async function workOverview(actor: DashUser) {
  return api.get<WorkOverview>("/work/overview", { actor_id: actor.id });
}

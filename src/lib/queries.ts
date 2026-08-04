import "server-only";
import { api } from "./api";
import type { Activity, DashUser, LeadRow, Note, LeadStatus } from "./types";

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
  page?: number;
  perPage?: number;
}

export async function listLeads(f: LeadFilter) {
  return api.get<{ rows: LeadRow[]; total: number; pages: number; page: number }>("/leads", {
    status: f.status,
    s: f.search,
    owner: f.ownerId ?? undefined,
    page: f.page ?? 1,
    per: f.perPage ?? 20,
  });
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
}) {
  return api.post<{ id: number; invite_token: string; temp_password: string }>("/users", {
    email: input.email,
    name: input.name,
    role: "subadmin",
    capacity: input.capacity,
    created_by: input.createdBy,
  });
}

export async function setUserStatus(id: number, status: "active" | "disabled") {
  await api.patch(`/users/${id}`, { status });
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

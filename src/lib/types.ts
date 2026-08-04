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

export function parsePayload(raw: string | null): PayloadRow[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

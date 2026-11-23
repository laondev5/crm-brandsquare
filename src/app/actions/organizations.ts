"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  isAdminRole,
  ORG_STATUSES,
  ORG_TYPES,
  type OrganizationDetail,
  type OrgNote,
  type Role,
} from "@/lib/types";
import {
  addOrgNote,
  createOrganization,
  deleteOrgNote,
  deleteOrganization,
  updateOrganization,
  type OrganizationInput,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };

/** Adding an organisation is selling, so it follows the same power as adding a
 *  lead by hand. The plugin enforces this too — the check here is only so the
 *  person reads a sentence instead of a 403. */
function mayAdd(role: Role, permissions: string[]) {
  return isAdminRole(role) || (role === "subadmin" && permissions.includes("add_leads"));
}

function fail(e: unknown, fallback: string): Fail {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function readForm(form: FormData): OrganizationInput {
  const assigned = Number(form.get("assigned_to"));
  const status = String(form.get("status") ?? "");
  const type = String(form.get("org_type") ?? "");

  return {
    name: String(form.get("name") ?? "").trim(),
    org_type: ORG_TYPES.some((t) => t.key === type) ? type : "partner",
    org_type_other:
      type === "other" ? String(form.get("org_type_other") ?? "").trim().slice(0, 60) : "",
    status: ORG_STATUSES.some((s) => s.key === status) ? status : "prospect",
    sector: String(form.get("sector") ?? "").trim(),
    website: String(form.get("website") ?? "").trim(),
    country: String(form.get("country") ?? "").trim(),
    location: String(form.get("location") ?? "").trim(),
    contact_name: String(form.get("contact_name") ?? "").trim(),
    contact_email: String(form.get("contact_email") ?? "").trim(),
    contact_phone: String(form.get("contact_phone") ?? "").trim(),
    source: String(form.get("source") ?? "").trim(),
    notes: String(form.get("notes") ?? "").trim(),
    // Only an admin can name an owner; the plugin ignores it for anyone else.
    assigned_to: assigned > 0 ? assigned : null,
  };
}

export type OrganizationFormState = { ok?: true; organization?: OrganizationDetail; error?: string } | null;

export async function saveOrganizationAction(
  _prev: OrganizationFormState,
  form: FormData
): Promise<OrganizationFormState> {
  const me = await requireUser();
  const id = Number(form.get("id"));
  if (!mayAdd(me.role, me.permissions)) {
    return {
      error: id
        ? "You do not have permission to change organisations."
        : "You do not have permission to add organisations.",
    };
  }

  const input = readForm(form);
  if (!input.name) return { error: "Give the organisation a name." };

  try {
    const res = id > 0 ? await updateOrganization(me, id, input) : await createOrganization(me, input);
    revalidatePath("/organizations");
    revalidatePath(`/organizations/${res.organization.id}`);
    if (!id) revalidatePath("/");
    return { ok: true, organization: res.organization };
  } catch (e) {
    return fail(e, "Could not save the organisation.");
  }
}

export async function addOrgNoteAction(id: number, body: string): Promise<{ note: OrgNote } | Fail> {
  const me = await requireUser();
  if (!body.trim()) return { error: "A note cannot be empty." };

  try {
    const res = await addOrgNote(me, id, body);
    revalidatePath(`/organizations/${id}`);
    return { note: res.note };
  } catch (e) {
    return fail(e, "Could not add the note.");
  }
}

export async function deleteOrgNoteAction(id: number, noteId: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();

  try {
    await deleteOrgNote(me, id, noteId);
    revalidatePath(`/organizations/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not remove the note.");
  }
}

export async function deleteOrganizationAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  if (!isAdminRole(me.role)) return { error: "Only an admin can delete an organisation." };

  try {
    await deleteOrganization(me, id);
    revalidatePath("/organizations");
    revalidatePath(`/organizations/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete the organisation.");
  }
}

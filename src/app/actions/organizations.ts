"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  isAdminRole,
  ORG_STATUSES,
  ORG_TYPES,
  type DashUser,
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
  uploadOrgFile,
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

/** Files chosen on the create form, before the company has an id to hang them
 *  on. The same 20 MB ceiling the company page's Files tab uses. */
const MAX_FILES_BYTES = 20 * 1024 * 1024;

function chosenFiles(form: FormData): File[] {
  return form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
}

export type OrganizationFormState =
  | { ok?: true; organization?: OrganizationDetail; error?: string; warning?: string }
  | null;

export async function saveOrganizationAction(
  _prev: OrganizationFormState,
  form: FormData
): Promise<OrganizationFormState> {
  // Keep the auth redirect outside the catch: a redirect is thrown on purpose
  // and must never be turned into a form message.
  const me = await requireUser();
  try {
    return await saveOrganization(me, form);
  } catch (e) {
    // Nothing here should be able to escape to the full-page error boundary —
    // the person filling the form needs to see what stopped the save.
    console.error("[organizations] save failed", e);
    return fail(e, "Something went wrong while saving the company. Nothing was saved; please try again.");
  }
}

async function saveOrganization(me: DashUser, form: FormData): Promise<OrganizationFormState> {
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

  // Files only come through on a new company; an existing one attaches them
  // from its own Files tab.
  const files = id ? [] : chosenFiles(form);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > MAX_FILES_BYTES) {
    return {
      error: `Those files come to ${Math.round(totalBytes / 1024 / 1024)} MB. The limit is 20 MB in all.`,
    };
  }

  const res = id > 0 ? await updateOrganization(me, id, input) : await createOrganization(me, input);

  // The company exists now, so its files have somewhere to go. A file that
  // fails does not undo the record — it is named, and can be attached again.
  const failed: string[] = [];
  for (const file of files) {
    try {
      await uploadOrgFile(res.organization.id, me, file);
    } catch {
      failed.push(file.name);
    }
  }

  revalidatePath("/organizations");
  revalidatePath(`/organizations/${res.organization.id}`);
  if (!id) revalidatePath("/");
  return {
    ok: true,
    organization: res.organization,
    warning: failed.length
      ? `The company was created, but these files did not attach: ${failed.join(", ")}. Add them from the company page.`
      : undefined,
  };
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

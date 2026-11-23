"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deleteLeadFile, uploadLeadFile, uploadOrgFile } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { LeadFile } from "@/lib/types";

type Result = { files: LeadFile[] } | { error: string };

/**
 * Uploads are capped here as well as by WordPress.
 *
 * PHP's own limit produces an HTML error page rather than a JSON error, which
 * surfaces as an unhelpful parse failure, and by then the whole file has
 * already crossed the wire. Refusing early costs nothing and can actually say
 * what went wrong.
 */
const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadFileAction(leadId: number, form: FormData): Promise<Result> {
  const me = await requireUser();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to attach." };
  }
  if (file.size > MAX_BYTES) {
    return { error: `That file is ${Math.round(file.size / 1024 / 1024)} MB. The limit is 20 MB.` };
  }

  try {
    const res = await uploadLeadFile(leadId, me, file);
    revalidatePath(`/leads/${leadId}`);
    return { files: res.files ?? [] };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not attach that file." };
  }
}

/** The same file list, when the record it hangs off is a company. */
export async function uploadOrgFileAction(orgId: number, form: FormData): Promise<Result> {
  const me = await requireUser();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to attach." };
  }
  if (file.size > MAX_BYTES) {
    return { error: `That file is ${Math.round(file.size / 1024 / 1024)} MB. The limit is 20 MB.` };
  }

  try {
    const res = await uploadOrgFile(orgId, me, file);
    revalidatePath(`/organizations/${orgId}`);
    return { files: res.files ?? [] };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not attach that file." };
  }
}

export async function deleteOrgFileAction(orgId: number, fileId: number): Promise<Result> {
  const me = await requireUser();
  try {
    const res = await deleteLeadFile(fileId, me);
    revalidatePath(`/organizations/${orgId}`);
    return { files: res.files ?? [] };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not remove that file." };
  }
}

export async function deleteFileAction(leadId: number, fileId: number): Promise<Result> {
  const me = await requireUser();
  try {
    const res = await deleteLeadFile(fileId, me);
    revalidatePath(`/leads/${leadId}`);
    return { files: res.files ?? [] };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not remove that file." };
  }
}

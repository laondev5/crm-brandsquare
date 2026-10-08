"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin, requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/types";
import { mailAttachmentUrl, mailSendPass, type UploadPass } from "@/lib/wa-upload";
import {
  deleteMailThreads,
  mailThreadsToLeads,
  markMailRead,
  saveMailSettings,
  sendMailMessage,
  syncMail,
  wipeMail,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { MailStatus } from "@/lib/types";

type Failure = { error: string };

const fail = (e: unknown, fallback: string): Failure => ({ error: e instanceof ApiError ? e.message : fallback });

/**
 * The inbox is a mailbox: whoever may send email to leads may use it. Checked
 * here to save a round trip; the plugin is the real gate, and applies the
 * "admins only" setting the super admin may have chosen on top.
 */
async function emailer() {
  const me = await requireUser();
  return hasPermission(me, "send_email") ? me : null;
}

/**
 * A reply or a new message with no attachments.
 *
 * Attachments cannot come through here -- this app runs on Vercel, which
 * refuses a request body over 4.5 MB -- so a message with files is sent by the
 * browser directly, with the pass from mailSendPassAction.
 */
export async function sendMailAction(input: {
  threadId?: number | null;
  to?: string;
  cc?: string;
  subject?: string;
  text: string;
}): Promise<{ threadId: number | null } | Failure> {
  const me = await emailer();
  if (!me) return { error: "You do not have permission to send email." };
  if (!input.text.trim()) return { error: "Write something first." };

  try {
    const res = await sendMailMessage(me, {
      thread_id: input.threadId ?? undefined,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
    });
    revalidatePath("/mail");
    return { threadId: res.thread_id };
  } catch (e) {
    return fail(e, "Could not send that email.");
  }
}

/** Permission for the browser to post a message with files straight to WordPress. */
export async function mailSendPassAction(): Promise<UploadPass | Failure> {
  const me = await emailer();
  if (!me) return { error: "You do not have permission to send email." };
  return mailSendPass(me);
}

/** A link that downloads one attachment, good for a few minutes. */
export async function mailAttachmentLinkAction(attachmentId: number): Promise<{ url: string } | Failure> {
  const me = await emailer();
  if (!me) return { error: "You do not have permission to open email." };
  if (!attachmentId) return { error: "No attachment." };
  return { url: mailAttachmentUrl(attachmentId, me) };
}

export async function markMailReadAction(id: number) {
  const me = await emailer();
  if (!me) return;
  try {
    await markMailRead(me, id);
    revalidatePath("/mail");
  } catch {
    // An unread badge staying lit one refresh longer is not worth an error.
  }
}

/**
 * Takes conversations out of this inbox's copy.
 *
 * Admins and up. Gmail itself is untouched -- it only forgets them here -- and
 * a new message in one brings it back, so this tidies without destroying.
 */
export async function deleteMailThreadsAction(ids: number[]): Promise<{ removed: number } | Failure> {
  const me = await requireAdmin();
  const wanted = [...new Set(ids.map(Number).filter((n) => n > 0))];
  if (wanted.length === 0) return { error: "Nothing was selected." };
  try {
    const res = await deleteMailThreads(me, wanted);
    revalidatePath("/mail");
    return { removed: res.removed };
  } catch (e) {
    return fail(e, "Could not remove those conversations.");
  }
}

/** Puts the people behind these conversations on the leads list, linking to those already there. */
export async function mailToLeadsAction(
  ids: number[]
): Promise<{ created: number; linked: number; already: number; failed: string[] } | Failure> {
  const me = await requireUser();
  if (!hasPermission(me, "add_leads")) return { error: "You do not have permission to add leads." };
  const wanted = [...new Set(ids.map(Number).filter((n) => n > 0))];
  if (wanted.length === 0) return { error: "Nothing was selected." };
  try {
    const res = await mailThreadsToLeads(me, wanted);
    revalidatePath("/mail");
    revalidatePath("/leads");
    return res;
  } catch (e) {
    return fail(e, "Could not add those to the leads list.");
  }
}

/** "Sync now": look in Gmail straight away instead of waiting for the next check. */
export async function syncMailAction(): Promise<{ status: MailStatus } | Failure> {
  const me = await emailer();
  if (!me) return { error: "You do not have permission to use the email inbox." };
  try {
    const res = await syncMail(me);
    revalidatePath("/mail");
    return res;
  } catch (e) {
    return fail(e, "Could not reach Gmail.");
  }
}

type Result = { ok?: string; error?: string };

/** The inbox's own settings: how far back to look, who may open it, how it signs off. */
export async function saveMailSettingsAction(_prev: Result, form: FormData): Promise<Result> {
  const me = await requireSuperAdmin();
  const days = Number(form.get("sync_days"));
  if (![7, 30, 90, 180, 365].includes(days)) return { error: "Choose how far back to look." };
  const visibility = String(form.get("visibility") ?? "everyone");
  if (visibility !== "everyone" && visibility !== "admins") return { error: "Choose who can see the inbox." };

  try {
    await saveMailSettings(me, {
      sync_days: days,
      visibility,
      from_name: String(form.get("from_name") ?? "").trim(),
      signature: String(form.get("signature") ?? "").trim(),
    });
    revalidatePath("/meetings/settings");
    revalidatePath("/mail");
    return { ok: "Saved." };
  } catch (e) {
    return fail(e, "Could not save.");
  }
}

/** Removes the imported mail from the CRM, leaving the Google connection and Gmail alone. */
export async function wipeMailAction(): Promise<Result> {
  const me = await requireSuperAdmin();
  try {
    await wipeMail(me);
    revalidatePath("/meetings/settings");
    revalidatePath("/mail");
    return { ok: "The imported mail has been removed. It will be fetched again from Gmail on the next sync." };
  } catch (e) {
    return fail(e, "Could not remove it.");
  }
}

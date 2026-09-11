"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { hasPermission, type WaTemplateInput } from "@/lib/types";
import {
  createWaTemplate,
  deleteWaTemplate,
  sendWaTemplate,
  uploadWaTemplateImage,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Fail = { error: string };
const fail = (e: unknown, fallback: string): Fail => ({
  error: e instanceof ApiError ? e.message : fallback,
});

/** Writing templates is an admin's job -- each one goes to Meta for review in
 *  the business's name. The plugin refuses anyone else as well. */
export async function createWaTemplateAction(
  input: WaTemplateInput
): Promise<{ ok: true; status: string } | Fail> {
  const me = await requireAdmin();
  try {
    const res = await createWaTemplate(me, input);
    revalidatePath("/templates");
    return { ok: true, status: res.template.status };
  } catch (e) {
    return fail(e, "Could not create that template.");
  }
}

export async function deleteWaTemplateAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireAdmin();
  try {
    await deleteWaTemplate(me, id);
    revalidatePath("/templates");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete that template.");
  }
}

const MAX_IMAGE = 5 * 1024 * 1024;

/** Refused here before the bytes travel on to WordPress, for the same reason
 *  as lead files: a host's own size limit answers with an HTML page, not a
 *  reason anyone can act on. */
export async function uploadWaTemplateImageAction(form: FormData): Promise<{ url: string } | Fail> {
  const me = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return { error: "WhatsApp header images must be JPG or PNG." };
  }
  if (file.size > MAX_IMAGE) {
    return { error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. WhatsApp allows up to 5 MB.` };
  }
  try {
    return await uploadWaTemplateImage(me, file);
  } catch (e) {
    return fail(e, "Could not upload that image.");
  }
}

/**
 * Sends an approved template into a conversation, or to a lead -- which opens
 * the conversation if there is none yet. A send Meta turned down still comes
 * back as a stored message marked failed; that is reported as an error here,
 * since from the lead page there is no bubble to show it on.
 */
export async function sendWaTemplateAction(
  id: number,
  to: { conversation_id?: number; lead_id?: number },
  values: Record<string, string>
): Promise<{ ok: true; conversationId: number } | Fail> {
  const me = await requireUser();
  if (!hasPermission(me, "send_whatsapp")) {
    return { error: "You do not have permission to send WhatsApp messages." };
  }
  try {
    const res = await sendWaTemplate(me, id, to, values);
    revalidatePath("/whatsapp");
    if (to.lead_id) revalidatePath(`/leads/${to.lead_id}`);
    if (res.message.status === "failed") {
      return { error: res.message.error_message || "WhatsApp did not accept the message." };
    }
    return { ok: true, conversationId: res.conversation_id };
  } catch (e) {
    return fail(e, "Could not send that template.");
  }
}

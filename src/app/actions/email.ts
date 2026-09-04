"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/auth";
import { createEmailCampaign, saveEmailSettings } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { EmailBlocks } from "@/lib/types";
import type { FormState } from "./auth";
import { isAdminRole } from "@/lib/types";

export type SendState = FormState & { campaignId?: number };

export async function sendCampaignAction(_prev: SendState, form: FormData): Promise<SendState> {
  const me = await requireUser();

  // A sub-admin may only ever reach leads assigned to them. Their id is sent
  // as the scope and the plugin puts it in the WHERE clause.
  const ownerId = isAdminRole(me.role) ? null : me.id;

  const subject = String(form.get("subject") ?? "").trim();
  if (!subject) return { error: "Enter a subject line." };

  const audienceType = String(form.get("audience_type") ?? "all") as "all" | "form";
  const formId = Number(form.get("form_id")) || null;
  if (audienceType === "form" && !formId) return { error: "Choose a campaign form." };

  const blocks: EmailBlocks = {
    header_text: String(form.get("header_text") ?? ""),
    header_bg: String(form.get("header_bg") ?? "#07003A"),
    header_color: String(form.get("header_color") ?? "#FFFFFF"),
    body_html: String(form.get("body_html") ?? ""),
    body_bg: String(form.get("body_bg") ?? "#FFFFFF"),
    body_color: String(form.get("body_color") ?? "#2C2C33"),
    accent: String(form.get("accent") ?? "#F86E06"),
    cta_label: String(form.get("cta_label") ?? ""),
    cta_url: String(form.get("cta_url") ?? ""),
    footer_text: String(form.get("footer_text") ?? ""),
    footer_bg: String(form.get("footer_bg") ?? "#F6F6F9"),
    footer_color: String(form.get("footer_color") ?? "#7A7A7A"),
  };

  if (!blocks.body_html.trim()) return { error: "Write something in the body." };

  try {
    const res = await createEmailCampaign({
      subject,
      blocks,
      audienceType,
      formId,
      ownerId,
      send: true,
      actor: me,
    });

    revalidatePath("/email");
    return {
      ok: `Queued for ${res.queued} recipient${res.queued === 1 ? "" : "s"}. Sending runs in the background.`,
      campaignId: res.id,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    throw e;
  }
}

export async function saveEmailSettingsAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const patch: Record<string, unknown> = {
    from_email: String(form.get("from_email") ?? "").trim(),
    from_name: String(form.get("from_name") ?? "").trim(),
    reply_to: String(form.get("reply_to") ?? "").trim(),
    smtp_enabled: form.get("smtp_enabled") ? 1 : 0,
    smtp_host: String(form.get("smtp_host") ?? "").trim(),
    smtp_port: Number(form.get("smtp_port")) || 587,
    smtp_secure: String(form.get("smtp_secure") ?? "tls"),
    smtp_user: String(form.get("smtp_user") ?? "").trim(),
    batch_size: Number(form.get("batch_size")) || 20,
  };

  // Blank leaves the stored password alone; the masked value is never saved back.
  const pass = String(form.get("smtp_pass") ?? "");
  if (pass && pass !== "********") patch.smtp_pass = pass;

  try {
    await saveEmailSettings(patch);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    throw e;
  }

  revalidatePath("/email/settings");
  return { ok: "Sender settings saved." };
}

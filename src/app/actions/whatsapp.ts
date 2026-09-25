"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin, requireUser } from "@/lib/auth";
import { hasPermission, waMediaProblem } from "@/lib/types";
import { needsRepackaging, webmOpusToOgg } from "@/lib/ogg-opus";
import {
  deleteWaConversations,
  openLeadWaChat,
  waConversationsToLeads,
  markWaRead,
  saveWaSettings,
  sendWaMedia,
  sendWaMessage,
  simulateWaInbound,
  subscribeWaApp,
  verifyWaSettings,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { FormState } from "./auth";

export type SendWaState = FormState;

/**
 * Checked here as well as in the plugin, the same belt-and-braces pattern as
 * every other permission in this app — the plugin is the real gate (a
 * request forged straight at its API still gets refused), this one just
 * saves a round trip for someone who plainly should not see the button.
 */
export async function sendWaMessageAction(_prev: SendWaState, form: FormData): Promise<SendWaState> {
  const me = await requireUser();
  if (!hasPermission(me, "send_whatsapp")) return { error: "You do not have permission to send WhatsApp messages." };

  const id = Number(form.get("conversation_id"));
  const text = String(form.get("text") ?? "").trim();
  if (!id) return { error: "No conversation." };
  if (!text) return { error: "Type a message first." };

  try {
    await sendWaMessage(id, text, me);
    revalidatePath("/whatsapp");
    return { ok: "sent" };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not send that message." };
  }
}

export type SendWaMediaState = FormState;

/**
 * Sends a photo, video, document or voice note.
 *
 * A recording made in the browser arrives as WebM on Chrome and Edge, which is
 * Opus audio in a container WhatsApp refuses, so it is repackaged as Ogg on the
 * way past -- same audio, different box. Firefox and Safari record something
 * WhatsApp already accepts and are passed straight through.
 */
export async function sendWaMediaAction(
  _prev: SendWaMediaState,
  form: FormData
): Promise<SendWaMediaState> {
  const me = await requireUser();
  if (!hasPermission(me, "send_whatsapp")) {
    return { error: "You do not have permission to send WhatsApp messages." };
  }

  const id = Number(form.get("conversation_id"));
  if (!id) return { error: "No conversation." };

  const raw = form.get("file");
  if (!(raw instanceof File) || raw.size === 0) return { error: "Pick a file first." };

  let file = raw;
  if (needsRepackaging(file.type) || /\.webm$/i.test(file.name)) {
    try {
      const ogg = webmOpusToOgg(new Uint8Array(await file.arrayBuffer()));
      file = new File([ogg], file.name.replace(/\.[^.]+$/, "") + ".ogg", { type: "audio/ogg" });
    } catch {
      return {
        error:
          "That recording could not be prepared for WhatsApp. Record it again, or attach an audio file instead.",
      };
    }
  }

  const problem = waMediaProblem({ type: file.type, name: file.name, size: file.size });
  if (problem) return { error: problem };

  try {
    await sendWaMedia(id, me, file, String(form.get("caption") ?? "").trim());
    revalidatePath("/whatsapp");
    return { ok: "sent" };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not send that file." };
  }
}

/**
 * Adds the people behind these conversations to the leads list.
 *
 * Governed by the permission to add a lead rather than by being an admin: a
 * sales rep who can type a customer into the leads page by hand is the same
 * person deciding the enquiry they are reading is worth keeping.
 */
export async function addWaToLeadsAction(
  ids: number[]
): Promise<{ created: number; linked: number; already: number } | { error: string }> {
  const me = await requireUser();
  if (!hasPermission(me, "add_leads")) return { error: "You do not have permission to add leads." };

  const wanted = [...new Set(ids.map(Number).filter((n) => n > 0))];
  if (wanted.length === 0) return { error: "Nothing was selected." };

  try {
    const res = await waConversationsToLeads(me, wanted);
    revalidatePath("/whatsapp");
    revalidatePath("/leads");
    return { created: res.created, linked: res.linked, already: res.already };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not add those to the leads list." };
  }
}

/**
 * Deletes conversations outright.
 *
 * Admins and up, checked here and again in the plugin. Nothing is archived, so
 * the confirmation in front of this is the only thing between a tidy-up and
 * losing what was said to a customer.
 */
export async function deleteWaConversationsAction(
  ids: number[]
): Promise<{ deleted: number } | { error: string }> {
  const me = await requireAdmin();
  const wanted = [...new Set(ids.map(Number).filter((n) => n > 0))];
  if (wanted.length === 0) return { error: "Nothing was selected." };

  try {
    const res = await deleteWaConversations(me, wanted);
    revalidatePath("/whatsapp");
    return { deleted: res.deleted };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not delete those conversations." };
  }
}

/** Behind the WhatsApp button on a lead: where to take the admin. */
export async function openLeadChatAction(leadId: number): Promise<{ conversationId: number } | { error: string }> {
  const me = await requireUser();
  if (!hasPermission(me, "send_whatsapp")) return { error: "You do not have permission to send WhatsApp messages." };
  try {
    const res = await openLeadWaChat(leadId, me);
    revalidatePath(`/leads/${leadId}`);
    return { conversationId: res.conversation_id };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not open the WhatsApp chat." };
  }
}

export async function markWaReadAction(id: number) {
  const me = await requireUser();
  if (!me) return;
  try {
    await markWaRead(id);
    revalidatePath("/whatsapp");
  } catch {
    // Best effort — an unread badge staying lit one refresh longer than it
    // should is not worth surfacing an error for.
  }
}

export type WaSettingsState = FormState;

export async function saveWaSettingsAction(_prev: WaSettingsState, form: FormData): Promise<WaSettingsState> {
  const me = await requireSuperAdmin();

  try {
    await saveWaSettings(me, {
      phone_number_id: String(form.get("phone_number_id") ?? "").trim(),
      waba_id: String(form.get("waba_id") ?? "").trim(),
      display_phone: String(form.get("display_phone") ?? "").trim(),
      verify_token: String(form.get("verify_token") ?? "").trim(),
      // Blank means "leave the saved one alone" — the plugin never sends a
      // secret back to prefill these fields with, so an empty box here is
      // not the same thing as clearing it.
      access_token: String(form.get("access_token") ?? "").trim(),
      app_secret: String(form.get("app_secret") ?? "").trim(),
    });
    revalidatePath("/whatsapp/settings");
    return { ok: "Saved." };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save those settings." };
  }
}

export async function verifyWaSettingsAction(): Promise<{ ok: true; label: string } | { error: string }> {
  const me = await requireSuperAdmin();
  try {
    const res = await verifyWaSettings(me);
    return {
      ok: true,
      label: res.verified_name
        ? `${res.verified_name} — ${res.display_phone_number}`
        : res.display_phone_number || "Connected.",
    };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not reach Meta." };
  }
}

export type SimulateState = FormState;

/**
 * A testing tool, not a feature — it exists so the inbox can be proven
 * working before a real WhatsApp Business number is approved. The plugin
 * itself refuses this the moment real credentials are saved, which is the
 * actual guarantee; requireSuperAdmin here just keeps the button off a page
 * anyone else can reach.
 */
export async function simulateWaInboundAction(_prev: SimulateState, form: FormData): Promise<SimulateState> {
  const me = await requireSuperAdmin();

  const phone = String(form.get("phone") ?? "").trim();
  const text = String(form.get("text") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  if (!phone || !text) return { error: "A phone number and message are required." };

  try {
    await simulateWaInbound(me, phone, text, name || undefined);
    revalidatePath("/whatsapp");
    revalidatePath("/whatsapp/settings");
    return { ok: "sent" };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not simulate that message." };
  }
}

/** The one-click fix for the most common reason nothing arrives. */
export async function subscribeWaAction(): Promise<{ ok: true } | { error: string }> {
  const me = await requireSuperAdmin();
  try {
    await subscribeWaApp(me);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not reach Meta." };
  }
  revalidatePath("/whatsapp/settings");
  return { ok: true };
}

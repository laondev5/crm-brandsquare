"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/types";
import {
  markWaRead,
  saveWaSettings,
  sendWaMessage,
  simulateWaInbound,
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

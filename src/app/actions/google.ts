"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { disconnectGoogle, saveGoogleSettings, testGoogle } from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Result = { ok?: string; error?: string };

/** Client ID and secret. A blank secret keeps the saved one; it is never shown again. */
export async function saveGoogleAction(_prev: Result, form: FormData): Promise<Result> {
  const me = await requireSuperAdmin();
  const clientId = String(form.get("client_id") ?? "").trim();
  if (!clientId) return { error: "Paste the Client ID from Google Cloud." };
  if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
    return { error: "That does not look like a Google Client ID — it ends in .apps.googleusercontent.com." };
  }
  try {
    await saveGoogleSettings(me, { client_id: clientId, client_secret: String(form.get("client_secret") ?? "").trim() });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save." };
  }
  revalidatePath("/meetings/settings");
  return { ok: "Saved. Now press Connect Google account." };
}

export async function disconnectGoogleAction(): Promise<Result> {
  const me = await requireSuperAdmin();
  try {
    await disconnectGoogle(me);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not disconnect." };
  }
  revalidatePath("/meetings/settings");
  return { ok: "Disconnected. Meetings will need a pasted Meet link until an account is connected again." };
}

export async function testGoogleAction(): Promise<Result> {
  const me = await requireSuperAdmin();
  try {
    const r = await testGoogle(me);
    return { ok: `Working — the CRM can reach the Google Calendar of ${r.calendar}.` };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not reach Google." };
  }
}

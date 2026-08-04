"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSubadmin, setUserStatus } from "@/lib/queries";
import { sendInvite } from "@/lib/mailer";
import { ApiError } from "@/lib/api";
import type { FormState } from "./auth";

export async function createSubadminAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireRole("admin");

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const capacity = Number(form.get("capacity") ?? 0) || 0;

  if (!name) return { error: "Enter a name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };

  let created;
  try {
    // The plugin creates the account, the temporary password and the invite
    // token in one call, so a half-made user can't be left behind.
    created = await createSubadmin({ email, name, capacity, createdBy: admin.id });
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    throw e;
  }

  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/invite/${created.invite_token}`;
  const { sent } = await sendInvite({
    to: email,
    name,
    tempPassword: created.temp_password,
    link,
  });

  revalidatePath("/team");
  return {
    ok: sent
      ? `Invite sent to ${email}.`
      : "Account created. No SMTP configured, so the invite link was printed to the server console.",
  };
}

export async function setStatusAction(form: FormData) {
  await requireRole("admin");
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (status !== "active" && status !== "disabled") return;

  // The plugin drops every session for that user when disabling, so the
  // lockout is immediate rather than waiting for a token to lapse.
  await setUserStatus(id, status);
  revalidatePath("/team");
}

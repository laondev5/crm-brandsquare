"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSubadmin, setUserStatus, updateSubadmin, deleteSubadmin } from "@/lib/queries";
import { sendInvite } from "@/lib/mailer";
import { ApiError } from "@/lib/api";
import { PERMISSIONS, type Permission } from "@/lib/types";
import type { FormState } from "./auth";

function readPermissions(form: FormData): Permission[] {
  const sent = new Set(form.getAll("permissions").map(String));
  return PERMISSIONS.map((p) => p.key).filter((k) => sent.has(k));
}

export async function createSubadminAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireRole("admin");

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const permissions = readPermissions(form);

  if (!name) return { error: "Enter a name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };

  let created;
  try {
    // The plugin creates the account, the temporary password and the invite
    // token in one call, so a half-made user can't be left behind.
    created = await createSubadmin({ email, name, capacity: 0, createdBy: admin.id, permissions });
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

export async function updateSubadminAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireRole("admin");
  const id = Number(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const permissions = readPermissions(form);

  if (!name) return { error: "Enter a name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };

  try {
    await updateSubadmin(id, { name, email, permissions });
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    throw e;
  }

  revalidatePath("/team");
  return { ok: `${name} updated.` };
}

export async function deleteSubadminAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const id = Number(form.get("id"));

  if (id === admin.id) return { error: "You cannot delete your own account." };

  let res;
  try {
    res = await deleteSubadmin(id, admin);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    throw e;
  }

  revalidatePath("/team");
  revalidatePath("/leads");
  revalidatePath("/");

  const where = res.heirs
    ? `shared evenly across the remaining ${res.heirs} sub-admin${res.heirs === 1 ? "" : "s"}`
    : "moved to Unassigned — nobody else is active";

  return {
    ok: res.reassigned
      ? `${res.name} removed. ${res.reassigned} lead${res.reassigned === 1 ? "" : "s"} ${where}.`
      : `${res.name} removed. They had no leads.`,
  };
}

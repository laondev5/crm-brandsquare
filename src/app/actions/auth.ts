"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  attemptLogin,
  setSessionCookie,
  destroySession,
  acceptInvite,
  passwordProblem,
} from "@/lib/auth";

export type FormState = { error?: string; ok?: string };

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const h = await headers();
  const res = await attemptLogin(
    email,
    password,
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    h.get("user-agent") ?? ""
  );

  if ("error" in res) return { error: res.error };
  await setSessionCookie(res.token);

  // Deliberately NOT redirect() here. Redirecting from an action that also
  // sets a cookie makes the Set-Cookie header and the 303 depend on each
  // other; returning plainly lets the cookie land, then the client navigates.
  return { ok: "1" };
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function acceptInviteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const pw = String(form.get("password") ?? "");
  const pw2 = String(form.get("password2") ?? "");

  if (pw !== pw2) return { error: "The two passwords do not match." };
  const problem = passwordProblem(pw);
  if (problem) return { error: problem };

  const res = await acceptInvite(token, pw);
  if ("error" in res) return { error: res.error };

  redirect("/login?welcome=1");
}

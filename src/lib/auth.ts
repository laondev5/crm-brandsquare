import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError } from "./api";
import { isAdminRole } from "./types";
import type { DashUser, Role } from "./types";

export const SESSION_COOKIE = "bsq_session";
const SESSION_DAYS = 14;

/**
 * Passwords are never handled here. The plugin verifies them in PHP and hands
 * back an opaque session token, so no password hash ever crosses the network.
 */

export async function attemptLogin(email: string, password: string, ip = "", ua = "") {
  try {
    const res = await api.post<{ token: string; user: DashUser }>("/auth/login", {
      email,
      password,
      ip,
      ua,
    });
    return { token: res.token, user: res.user };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
      return { error: e.message };
    }
    throw e;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_DAYS * 864e5),
  });
}

/**
 * Resolves the signed-in user on every request. The plugin re-checks the
 * account is still active, so disabling someone locks them out immediately
 * rather than whenever a token would have expired.
 */
export async function currentUser(): Promise<DashUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const res = await api.get<{ user: DashUser | null }>("/auth/session", { token });
  return res.user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await api.post("/auth/logout", { token });
    } catch {
      // Clearing the cookie matters more than the round trip succeeding.
    }
  }
  jar.delete(SESSION_COOKIE);
}

/* ---------------- guards ---------------- */

/**
 * Redirects rather than throws. Next renders a layout and its page alongside
 * each other, so a page that threw would race the layout's redirect and could
 * surface a 500 instead of bouncing cleanly to the login screen.
 */
export async function requireUser(): Promise<DashUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(role: Role): Promise<DashUser> {
  const u = await requireUser();
  if (u.role !== role) redirect("/");
  return u;
}

/**
 * Either admin tier. Use this rather than requireRole("admin") — a super admin
 * outranks an admin, and an exact-match check would lock them out of every
 * screen an admin can reach, which is the opposite of what the rank means.
 */
export async function requireAdmin(): Promise<DashUser> {
  const u = await requireUser();
  if (!isAdminRole(u.role)) redirect("/");
  return u;
}

/** The top tier: manages admins and the connected websites. */
export async function requireSuperAdmin(): Promise<DashUser> {
  const u = await requireUser();
  if (u.role !== "superadmin") redirect("/");
  return u;
}

export function isAdmin(u: DashUser | null) {
  return u ? isAdminRole(u.role) : false;
}

/* ---------------- invites ---------------- */

export async function findInvite(token: string) {
  const res = await api.get<{ invite: { user_id: number; email: string; name: string } | null }>(
    "/invite",
    { token }
  );
  return res.invite;
}

export async function acceptInvite(token: string, password: string) {
  try {
    const res = await api.post<{ user_id: number }>("/invite/accept", { token, password });
    return { userId: res.user_id };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
      return { error: e.message };
    }
    throw e;
  }
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Include at least one letter and one number.";
  return null;
}

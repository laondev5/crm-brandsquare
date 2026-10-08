import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { requireSuperAdmin } from "@/lib/auth";
import { getGoogleSettings } from "@/lib/queries";
import { GOOGLE_STATE_COOKIE, googleRedirectUri, googleScopesFor } from "@/lib/google";

/**
 * Starts "Connect Google account": sends the super admin to Google to approve
 * the connection. A one-time state value is kept in a short-lived cookie and
 * checked on the way back, so nobody else can finish the flow.
 *
 *   ?mail=1   also ask for the mailbox, for the email inbox
 *   ?hint=    an address to pre-select, so the organisation's account is the
 *             one on offer rather than whichever one the browser is signed into
 */
export async function GET(req: Request) {
  const me = await requireSuperAdmin();
  const q = new URL(req.url).searchParams;
  const withMail = q.get("mail") === "1";
  const hint = (q.get("hint") ?? "").trim();
  const g = await getGoogleSettings(me).catch(() => null);
  if (!g?.client_id || !g.has_secret) {
    return NextResponse.redirect(
      `${googleRedirectUri().replace("/api/google/callback", "")}/meetings/settings?error=${encodeURIComponent(
        "Save the Client ID and Client secret first."
      )}`
    );
  }

  const state = randomBytes(24).toString("hex");
  (await cookies()).set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: g.client_id,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: googleScopesFor(withMail).join(" "),
    access_type: "offline",
    // Always show the account chooser, so a browser that is signed into a
    // personal Gmail does not silently connect that one; and always ask for
    // consent, so Google always hands back a lasting (refresh) token.
    prompt: "select_account consent",
    // Deliberately not "include_granted_scopes": it would carry over what an
    // earlier connection was allowed, so a connection made without email
    // access could quietly regain it, and the box on the settings page would
    // not mean what it says.
    state,
    ...(hint ? { login_hint: hint } : {}),
  }).toString();
  return NextResponse.redirect(url.toString());
}

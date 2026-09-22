import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { requireSuperAdmin } from "@/lib/auth";
import { getGoogleSettings } from "@/lib/queries";
import { GOOGLE_SCOPES, GOOGLE_STATE_COOKIE, googleRedirectUri } from "@/lib/google";

/**
 * Starts "Connect Google account": sends the super admin to Google to approve
 * the meetings connection. A one-time state value is kept in a short-lived
 * cookie and checked on the way back, so nobody else can finish the flow.
 */
export async function GET() {
  const me = await requireSuperAdmin();
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
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    // Always ask, so Google always hands back a lasting (refresh) token.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return NextResponse.redirect(url.toString());
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSuperAdmin } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { GOOGLE_STATE_COOKIE, googleRedirectUri } from "@/lib/google";

/**
 * Google sends the super admin back here with a one-time code. The code goes
 * straight to the plugin, which trades it for the lasting connection and
 * stores it encrypted -- the token itself never passes through a browser.
 */
export async function GET(req: Request) {
  const me = await requireSuperAdmin();
  const q = new URL(req.url).searchParams;
  const back = (params: string) =>
    NextResponse.redirect(`${googleRedirectUri().replace("/api/google/callback", "")}/meetings/settings?${params}`);

  const jar = await cookies();
  const expected = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/google" });

  if (q.get("error")) {
    return back(`error=${encodeURIComponent(q.get("error") === "access_denied" ? "The connection was not approved in Google." : q.get("error")!)}`);
  }
  if (!expected || q.get("state") !== expected) {
    return back(`error=${encodeURIComponent("That sign-in link has expired. Press Connect Google account again.")}`);
  }
  const code = q.get("code");
  if (!code) return back(`error=${encodeURIComponent("Google did not send a sign-in code back.")}`);

  try {
    await exchangeGoogleCode(me, code, googleRedirectUri());
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof ApiError ? e.message : "Could not finish connecting to Google.")}`);
  }
  return back("connected=1");
}

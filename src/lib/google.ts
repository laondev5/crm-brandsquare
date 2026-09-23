import "server-only";

/** Where Google sends people back to after they approve the connection. */
export function googleRedirectUri() {
  let base = (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  // Google refuses a plain-http return address for any real domain (Error 400
  // invalid_request, "doesn't comply with OAuth 2.0 policy"). Only localhost
  // may stay on http.
  if (/^http:\/\//i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) {
    base = base.replace(/^http:/i, "https:");
  }
  return `${base}/api/google/callback`;
}

/**
 * What the meetings connection asks Google for: creating and changing events
 * (which is what makes Meet rooms and sends invites), and the account's email
 * address so the settings page can say which account is connected.
 */
export const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"];

export const GOOGLE_STATE_COOKIE = "bsq_google_state";

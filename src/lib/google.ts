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

/**
 * What the email inbox adds: reading, sending and marking messages read in the
 * connected mailbox. Asked for only when the person ticks the box, because it
 * is the more sensitive of the two and a connection used only for meetings has
 * no business holding it.
 */
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

export function googleScopesFor(withMail: boolean): string[] {
  return withMail ? [...GOOGLE_SCOPES, GMAIL_SCOPE] : GOOGLE_SCOPES;
}

export const GOOGLE_STATE_COOKIE = "bsq_google_state";

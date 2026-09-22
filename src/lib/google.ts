import "server-only";

/** Where Google sends people back to after they approve the connection. */
export function googleRedirectUri() {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/google/callback`;
}

/**
 * What the meetings connection asks Google for: creating and changing events
 * (which is what makes Meet rooms and sends invites), and the account's email
 * address so the settings page can say which account is connected.
 */
export const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"];

export const GOOGLE_STATE_COOKIE = "bsq_google_state";

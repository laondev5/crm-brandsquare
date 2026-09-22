import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { getGoogleSettings } from "@/lib/queries";
import { googleRedirectUri } from "@/lib/google";
import SelectOnFocusInput from "../../whatsapp/settings/select-on-focus";
import GoogleForm from "./google-form";

/**
 * The Google account meetings are held on.
 *
 * The same arrangement as WhatsApp and the Meta datasets: entered here by the
 * super admin or IT officer, the secret and the lasting token stored encrypted
 * on the WordPress side, and never sent back to a browser once saved.
 */
export default async function MeetingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const me = await requireSuperAdmin();
  const sp = await searchParams;
  const g = await getGoogleSettings(me).catch(() => null);
  const redirect = googleRedirectUri();

  return (
    <>
      <div className="head">
        <h1>Meeting settings</h1>
        <div className="spacer" />
        <Link href="/meetings" className="btn ghost">
          Meetings
        </Link>
      </div>

      {!g && <div className="msg err">Could not load settings. The plugin needs to be version 1.28 or newer.</div>}
      {sp.connected && <div className="msg ok">Google account connected. New meetings will get their own Meet room.</div>}
      {sp.error && <div className="msg err">{sp.error}</div>}

      {g && (
        <div className="grid2">
          <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
            <div className="card">
              <h2>Google account</h2>
              {g.connected ? (
                <div className="msg ok" style={{ margin: 0 }}>
                  Connected — <strong>{g.account_email || "Google account"}</strong>. Meetings are created on its
                  calendar with a Google Meet room, and Google sends the invites.
                </div>
              ) : (
                <div className="msg warn" style={{ margin: 0 }}>
                  Not connected. Meetings still work — whoever schedules one pastes a Meet link, and the CRM
                  sends the invites itself.
                </div>
              )}
              {g.last_error && (
                <div className="msg err" style={{ marginTop: 10 }}>
                  Last problem from Google: {g.last_error}
                </div>
              )}
            </div>

            <GoogleForm settings={g} />
          </div>

          <div className="card">
            <h2>How to set it up</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
              Once, about 10 minutes. Use the Google account that should host the meetings — ideally a
              company one such as meetings@brandsquare.shop.
            </p>
            <ol className="steps">
              <li>
                Open <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>{" "}
                signed in as that account, and create a project called <strong>Brandsquare CRM</strong>.
              </li>
              <li>
                Go to <strong>APIs &amp; Services → Library</strong>, search <strong>Google Calendar API</strong> and press{" "}
                <strong>Enable</strong>.
              </li>
              <li>
                Go to <strong>APIs &amp; Services → OAuth consent screen</strong>. Choose <strong>Internal</strong> if it
                is a Google Workspace account (otherwise <strong>External</strong>), app name <strong>Brandsquare CRM</strong>,
                your email as support and developer contact. Save. If you chose External, press{" "}
                <strong>Publish app</strong> so the connection does not expire after 7 days.
              </li>
              <li>
                Go to <strong>APIs &amp; Services → Credentials → Create credentials → OAuth client ID</strong>. Type:{" "}
                <strong>Web application</strong>. Under <strong>Authorised redirect URIs</strong> add exactly:
                <SelectOnFocusInput value={redirect} />
              </li>
              <li>
                Press <strong>Create</strong>. Copy the <strong>Client ID</strong> and <strong>Client secret</strong> into the
                form on the left and press <strong>Save</strong>.
              </li>
              <li>
                Press <strong>Connect Google account</strong>, sign in as the meetings account and allow access. You come
                back here and it says Connected.
              </li>
              <li>
                Press <strong>Test connection</strong>. Then schedule a meeting on the Meetings page with the link box left
                empty — it gets its own Meet room.
              </li>
            </ol>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 0 }}>
              The reminder 10 minutes before is always sent by the CRM (email and pop-up), whichever way the meeting
              was made.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

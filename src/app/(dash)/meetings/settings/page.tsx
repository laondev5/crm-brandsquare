import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { getGoogleSettings, getMailSettings } from "@/lib/queries";
import { googleRedirectUri } from "@/lib/google";
import SelectOnFocusInput from "../../whatsapp/settings/select-on-focus";
import GoogleForm from "./google-form";
import MailSettingsCard from "./mail-settings";

/**
 * The Google account the CRM acts as: meetings are held on its calendar, and
 * the email inbox is its mailbox.
 *
 * The same arrangement as WhatsApp and the Meta datasets: entered here by the
 * super admin or IT officer, the secret and the lasting token stored encrypted
 * on the WordPress side, and never sent back to a browser once saved.
 */
export default async function GoogleAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const me = await requireSuperAdmin();
  const sp = await searchParams;
  const g = await getGoogleSettings(me).catch(() => null);
  const mail = g?.connected ? await getMailSettings(me).catch(() => null) : null;
  const redirect = googleRedirectUri();

  return (
    <>
      <div className="head">
        <h1>Google account</h1>
        <div className="spacer" />
        <Link href="/meetings" className="btn ghost">
          Meetings
        </Link>
        {g?.has_gmail && (
          <Link href="/mail" className="btn ghost">
            Email inbox
          </Link>
        )}
      </div>

      {!g && <div className="msg err">Could not load settings. The plugin needs to be version 1.37 or newer.</div>}
      {sp.connected && (
        <div className="msg ok">
          Google account connected. New meetings get their own Meet room
          {g?.has_gmail ? ", and the email inbox starts filling." : "."}
        </div>
      )}
      {sp.error && <div className="msg err">{sp.error}</div>}

      {g && (
        <div className="grid2">
          <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
            <div className="card">
              <h2>Connected account</h2>
              {g.connected ? (
                <>
                  <div className="msg ok" style={{ margin: 0 }}>
                    Connected &mdash; <strong>{g.account_email || "Google account"}</strong>. Meetings are created on
                    its calendar with a Google Meet room, and Google sends the invites.
                  </div>
                  <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", fontSize: 13, lineHeight: 1.9 }}>
                    <li>
                      {g.has_calendar ? "✓" : "✗"} Calendar &mdash; {g.has_calendar ? "meetings and Meet rooms" : "not allowed"}
                    </li>
                    <li>
                      {g.has_gmail ? "✓" : "✗"} Email &mdash;{" "}
                      {g.has_gmail ? "the email inbox is on" : "not allowed yet; connect again with the email box ticked"}
                    </li>
                  </ul>
                </>
              ) : (
                <div className="msg warn" style={{ margin: 0 }}>
                  Not connected. Meetings still work &mdash; whoever schedules one pastes a Meet link, and the CRM sends
                  the invites itself.
                </div>
              )}
              {g.last_error && (
                <div className="msg err" style={{ marginTop: 10 }}>
                  Last problem from Google: {g.last_error}
                </div>
              )}
              {g.legacy_meetings > 0 && (
                <div className="msg warn" style={{ marginTop: 10 }}>
                  {g.legacy_meetings} upcoming meeting{g.legacy_meetings === 1 ? " is" : "s are"} on a previous
                  account&rsquo;s calendar. The CRM can no longer change or cancel {g.legacy_meetings === 1 ? "it" : "those"}{" "}
                  on Google, so do that from that account if the time moves.
                </div>
              )}
            </div>

            <GoogleForm settings={g} />

            {mail && <MailSettingsCard settings={mail} />}
          </div>

          <div className="card">
            <h2>How to set it up</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
              Once, about 10 minutes. Use the Google account that should belong to the company &mdash; ideally one such
              as meetings@brandsquare.shop, not a personal address. To move to a different account later, use{" "}
              <strong>Change account</strong>; no need to start again.
            </p>
            <ol className="steps">
              <li>
                Open{" "}
                <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">
                  Google Cloud Console
                </a>{" "}
                signed in as that account, and create a project called <strong>Brandsquare CRM</strong>.
              </li>
              <li>
                Go to <strong>APIs &amp; Services → Library</strong>, search <strong>Google Calendar API</strong> and press{" "}
                <strong>Enable</strong>. Do the same for <strong>Gmail API</strong> if you want the email inbox.
              </li>
              <li>
                Go to <strong>APIs &amp; Services → OAuth consent screen</strong> (called <em>Google Auth Platform</em> in
                newer consoles). Choose <strong>Internal</strong> if it is a Google Workspace account (otherwise{" "}
                <strong>External</strong>), app name <strong>Brandsquare CRM</strong>, your email as support and developer
                contact. Save.
              </li>
              <li>
                Under <strong>Data access</strong> (or <strong>Scopes</strong>) press <strong>Add or remove scopes</strong>{" "}
                and add <code>…/auth/calendar.events</code> and, for email, <code>…/auth/gmail.modify</code>. If you
                chose External, press <strong>Publish app</strong> so the connection does not expire after 7 days. Google
                will show a &ldquo;Google hasn&rsquo;t verified this app&rdquo; screen when you connect; choose{" "}
                <strong>Advanced → Go to Brandsquare CRM</strong>. That is expected for a company&rsquo;s own app.
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
                Type the company address, leave <strong>Also connect its email inbox</strong> ticked if you want it, and
                press <strong>Connect Google account</strong>. Choose the company account in Google&rsquo;s list and allow
                access. You come back here and it says Connected.
              </li>
              <li>
                Press <strong>Test connection</strong>. Then schedule a meeting on the Meetings page with the link box left
                empty &mdash; it gets its own Meet room &mdash; and open <strong>Leads → Email inbox</strong>.
              </li>
            </ol>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 0 }}>
              The reminder 10 minutes before a meeting is always sent by the CRM (email and pop-up), whichever way the
              meeting was made. Bulk email campaigns are separate: they send from the address set under{" "}
              <Link href="/email/settings">Email → Sender settings</Link>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

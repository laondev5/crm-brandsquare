import { requireSuperAdmin } from "@/lib/auth";
import { getWaDiagnostics, getWaSettings } from "@/lib/queries";
import SettingsForm from "./settings-form";
import SimulateForm from "./simulate-form";
import SelectOnFocusInput from "./select-on-focus";
import Diagnostics from "./diagnostics";

/**
 * The Meta credentials live only here, entered by a super admin and stored
 * encrypted on the WordPress side — never in an environment file, and never
 * sent back to any browser once saved. The same tier and the same reasoning
 * as connecting a website: whoever holds this can act as the business.
 */
export default async function WhatsAppSettingsPage() {
  const me = await requireSuperAdmin();

  let settings;
  try {
    settings = await getWaSettings(me);
  } catch {
    return (
      <>
        <div className="head">
          <h1>WhatsApp settings</h1>
        </div>
        <div className="msg err">Could not load settings. Check the plugin is up to date.</div>
      </>
    );
  }

  // Asked only once credentials exist: without a token there is nothing to
  // ask Meta, and an older plugin without the endpoint must not break the page.
  const diag = settings.configured ? await getWaDiagnostics(me).catch(() => null) : null;

  return (
    <>
      <div className="head">
        <h1>WhatsApp settings</h1>
      </div>

      {diag && <Diagnostics diag={diag} />}

      <div className="grid2">
        <SettingsForm settings={settings} />

        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          <div className="card">
            <h2>Webhook</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
              In Meta&rsquo;s App Dashboard, under WhatsApp → Configuration, set the callback URL
              to this address and the verify token to the one saved on the left.
            </p>
            <label className="f">
              <span>Callback URL</span>
              <SelectOnFocusInput value={settings.webhook_url} />
            </label>
          </div>

          {!settings.configured && <SimulateForm />}
        </div>
      </div>
    </>
  );
}

import { requireUser } from "@/lib/auth";
import { listKb } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import KbBrowser from "../kb-browser";
import HowTo from "../how-to";

export default async function ResponseTemplatesPage() {
  const me = await requireUser();
  const items = await listKb("response").catch(() => null);

  return (
    <>
      <div className="head">
        <h1>Response templates</h1>
      </div>

      <HowTo
        title="Response templates"
        steps={[
          {
            title: "Find the situation",
            body: <>Search, or pick a section — first contact, quotations, shipping, payment, objections, follow-ups.</>,
          },
          {
            title: "Fill in the blanks once",
            body: (
              <>
                Type the customer&rsquo;s name and the machine in the boxes at the top. Every template
                on the page fills in with them, and your own name is already there.
              </>
            ),
          },
          {
            title: "Check what is still highlighted",
            body: <>Yellow blanks like [Amount] or [Video Link] still need you — fill them in after pasting.</>,
          },
          {
            title: "Copy and send",
            body: (
              <>
                Press <strong>Copy</strong> and paste into WhatsApp, email or a comment reply. They are
                also in the <strong>Ready-made replies</strong> panel in the WhatsApp inbox and{" "}
                <strong>Use a template…</strong> when emailing a lead, filled with that lead&rsquo;s name.
              </>
            ),
          },
          {
            title: "Always check before sending",
            body: <>Confirm current prices, timelines and technical details are right for this customer.</>,
          },
          ...(isAdminRole(me.role)
            ? [{ title: "Keep them up to date", body: <>Admins: press <strong>Add or edit templates</strong> to change wording or add new situations.</> }]
            : []),
        ]}
      />

      {!items ? (
        <div className="msg err">Could not load response templates. The WordPress plugin needs to be version 1.24.0 or newer.</div>
      ) : (
        <KbBrowser
          kind="response"
          items={items}
          meName={me.name}
          manageHref={isAdminRole(me.role) ? "/settings/responses" : undefined}
        />
      )}
    </>
  );
}

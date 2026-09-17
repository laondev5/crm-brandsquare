import { requireUser } from "@/lib/auth";
import { listKb } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import KbBrowser from "../kb-browser";
import HowTo from "../how-to";

export default async function FaqPage() {
  const me = await requireUser();
  const items = await listKb("faq").catch(() => null);

  return (
    <>
      <div className="head">
        <h1>Frequently asked questions</h1>
      </div>

      <HowTo
        title="FAQs"
        steps={[
          {
            title: "Look up the customer's question",
            body: <>Search a word from it — “warranty”, “naira”, “customs” — or open a section.</>,
          },
          {
            title: "Open the question",
            body: <>Click it to see the recommended answer. Searching opens every match at once.</>,
          },
          {
            title: "Copy the answer, then make it yours",
            body: (
              <>
                Press <strong>Copy</strong>, paste it into your reply and adjust it to the customer. For
                a longer, ready-to-send message use <strong>Response templates</strong>.
              </>
            ),
          },
          {
            title: "Confirm the details",
            body: <>The answers are guides: always confirm current prices, timelines and technical details.</>,
          },
          ...(isAdminRole(me.role)
            ? [{ title: "Add new questions as they come up", body: <>Admins: press <strong>Add or edit FAQs</strong>.</> }]
            : []),
        ]}
      />

      {!items ? (
        <div className="msg err">Could not load FAQs. The WordPress plugin needs to be version 1.24.0 or newer.</div>
      ) : (
        <KbBrowser kind="faq" items={items} meName={me.name} manageHref={isAdminRole(me.role) ? "/settings/faq" : undefined} />
      )}
    </>
  );
}

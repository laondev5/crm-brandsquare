import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listKb } from "@/lib/queries";
import KbManager from "../kb-manager";
import HowTo from "../../templates/how-to";

export default async function ResponseSettingsPage() {
  await requireAdmin();
  const items = await listKb("response").catch(() => null);

  return (
    <>
      <div className="head">
        <h1>Response template settings</h1>
        <div className="spacer" />
        <Link href="/templates/responses" className="btn ghost">
          View as the team sees it
        </Link>
      </div>

      <HowTo
        title="Managing response templates"
        steps={[
          { title: "Add a template", body: <>Choose its section (or create a new one), give it a title that says when to use it, and write the message.</> },
          { title: "Use the standard blanks", body: <>[Name], [Machine Name] and [Your Name] fill in automatically. Other blanks like [Amount] are highlighted for the sender.</> },
          { title: "Edit or remove", body: <>Press <strong>Edit</strong> on any template to reword it, or <strong>Delete</strong> when it no longer applies.</> },
          { title: "Put the most used first", body: <>Use the arrows to reorder templates within a section.</> },
          { title: "Changes are instant", body: <>Everyone sees the new wording straight away — on the Response templates page, in the WhatsApp quick replies and in the lead email box.</> },
        ]}
      />

      {!items ? (
        <div className="msg err">Could not load response templates. The WordPress plugin needs to be version 1.24.0 or newer.</div>
      ) : (
        <KbManager kind="response" items={items} />
      )}
    </>
  );
}

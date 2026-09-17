import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listKb } from "@/lib/queries";
import KbManager from "../kb-manager";
import HowTo from "../../templates/how-to";

export default async function FaqSettingsPage() {
  await requireAdmin();
  const items = await listKb("faq").catch(() => null);

  return (
    <>
      <div className="head">
        <h1>FAQ settings</h1>
        <div className="spacer" />
        <Link href="/templates/faq" className="btn ghost">
          View as the team sees it
        </Link>
      </div>

      <HowTo
        title="Managing FAQs"
        steps={[
          { title: "Add a question", body: <>Pick a section, type the question the way customers ask it, and write the recommended answer.</> },
          { title: "Edit or remove", body: <>Press <strong>Edit</strong> to update an answer when prices, timelines or terms change, or <strong>Delete</strong> it.</> },
          { title: "Order by importance", body: <>Use the arrows so the most common questions sit at the top of each section.</> },
          { title: "Add new ones as they come up", body: <>A question the team keeps getting belongs here — the FAQ page updates for everyone immediately.</> },
        ]}
      />

      {!items ? (
        <div className="msg err">Could not load FAQs. The WordPress plugin needs to be version 1.24.0 or newer.</div>
      ) : (
        <KbManager kind="faq" items={items} />
      )}
    </>
  );
}

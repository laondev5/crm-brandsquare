import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getEmailSettings, listTemplates } from "@/lib/queries";
import SnippetManager from "../snippets";
import HowTo from "../how-to";

export default async function EmailTemplatesPage() {
  await requireUser();
  const [templates, settings] = await Promise.all([
    listTemplates("email").catch(() => []),
    getEmailSettings().catch(() => null),
  ]);

  return (
    <>
      <div className="head">
        <h1>Email templates</h1>
      </div>

      <HowTo
        title="Email templates"
        steps={[
          {
            title: "Write it once",
            body: (
              <>
                Give it a name you will find again (&ldquo;Price list follow-up&rdquo;), a subject
                and the message.
              </>
            ),
          },
          {
            title: "Personalise it",
            body: (
              <>
                Press the field buttons to add the lead&rsquo;s <em>First name</em>,{" "}
                <em>Company</em> and so on — in the subject too. They fill in when you use it.
              </>
            ),
          },
          { title: "Check the preview", body: <>The preview shows it as a sample lead would receive it.</> },
          {
            title: "Send it to one lead",
            body: (
              <>
                Open the lead, press <strong>Send email</strong> and choose from{" "}
                <strong>Use a template…</strong>. Subject and message fill in with that lead&rsquo;s
                details. Change anything you like, then Send.
              </>
            ),
          },
          {
            title: "Or use it for a bulk email",
            body: (
              <>
                Go to <Link href="/email/new">Email → New email</Link> and choose from{" "}
                <strong>Use a template…</strong>. First name, full name and email fill in for each
                person; company and phone only fill in on single emails sent from a lead&rsquo;s
                page.
              </>
            ),
          },
          {
            title: "Keep them tidy",
            body: (
              <>
                <strong>Edit</strong> to reword, <strong>Copy</strong> to make a variation,{" "}
                <strong>Delete</strong> when one is out of date.
              </>
            ),
          },
        ]}
      />

      <SnippetManager channel="email" templates={templates} fromLabel={settings?.from_name || "Brandsquare"} />
    </>
  );
}

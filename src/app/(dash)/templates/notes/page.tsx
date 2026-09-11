import { requireUser } from "@/lib/auth";
import { listTemplates } from "@/lib/queries";
import SnippetManager from "../snippets";
import HowTo from "../how-to";

export default async function NoteTemplatesPage() {
  await requireUser();
  const templates = await listTemplates("note").catch(() => []);

  return (
    <>
      <div className="head">
        <h1>Note templates</h1>
      </div>

      <HowTo
        title="Note templates"
        steps={[
          {
            title: "For things you write on leads again and again",
            body: <>&ldquo;No answer&rdquo;, &ldquo;Sent price list&rdquo;, &ldquo;Wants a site visit&rdquo;.</>,
          },
          { title: "Write and save it below", body: <>Use the field buttons to include the lead&rsquo;s name or company.</> },
          {
            title: "Use it on a lead",
            body: (
              <>
                In the lead&rsquo;s <strong>Manage</strong> box, choose from{" "}
                <strong>Use a template…</strong> above <em>Add a note</em>. It drops in with the
                lead&rsquo;s details; add anything specific, then save.
              </>
            ),
          },
        ]}
      />

      <SnippetManager channel="note" templates={templates} />
    </>
  );
}

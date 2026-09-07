import { requireUser } from "@/lib/auth";
import { listTemplates } from "@/lib/queries";
import TemplateManager from "./manager";

export default async function TemplatesPage() {
  // Templates are shared wording, not private drafts — anyone who can send a
  // message can use and write them.
  await requireUser();
  const templates = await listTemplates().catch(() => []);

  return (
    <>
      <div className="head">
        <h1>Templates</h1>
      </div>

      <p className="board-hint">
        Wording you send often — a first reply, a quote chase, a &ldquo;still interested?&rdquo;
        message. Write it once here and pick it from the note, email or WhatsApp box on any lead
        instead of retyping it.
      </p>

      <TemplateManager initial={templates} />
    </>
  );
}

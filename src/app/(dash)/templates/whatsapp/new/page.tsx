import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listWaTemplates } from "@/lib/queries";
import TemplateBuilder from "@/app/(dash)/whatsapp/templates/template-builder";

/** Writing a WhatsApp template. `?from=` starts from a copy of an existing
 *  one -- which is also how a rejected template gets fixed, since Meta does
 *  not let one be edited back into review. */
export default async function NewWaTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const from = sp.from
    ? ((await listWaTemplates().catch(() => null))?.templates.find((t) => t.id === Number(sp.from)) ?? null)
    : null;

  return (
    <>
      <div className="head">
        <h1>{from ? "Copy a WhatsApp template" : "New WhatsApp template"}</h1>
        <div className="spacer" />
        <Link href="/templates/whatsapp" className="btn ghost">
          Back to templates
        </Link>
      </div>

      <TemplateBuilder from={from} />
    </>
  );
}

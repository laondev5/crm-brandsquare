import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDocSettings } from "@/lib/queries";
import DocumentSettingsForm from "./form";

/**
 * The letterhead and boilerplate behind every document.
 *
 * One place to change what the papers say, so the next quotation, invoice or
 * receipt leaves with the right address, bank account and signatory without
 * anyone editing a template.
 */
export default async function DocumentSettingsPage() {
  await requireAdmin();

  const data = await getDocSettings().catch(() => null);

  return (
    <>
      <div className="head">
        <h1>Document settings</h1>
        <div className="spacer" />
        <Link href="/quotes" className="btn ghost">
          Quotations
        </Link>
        <Link href="/invoices" className="btn ghost">
          Invoices
        </Link>
      </div>

      {!data ? (
        <div className="msg err">
          Could not load the settings. The plugin needs to be version 1.38 or newer.
        </div>
      ) : (
        <>
          <p className="board-hint">
            These are the words and numbers the PDFs are drawn with. Saving changes the next
            document; anything already written keeps its own copy.
          </p>
          <DocumentSettingsForm settings={data.settings} />
        </>
      )}
    </>
  );
}

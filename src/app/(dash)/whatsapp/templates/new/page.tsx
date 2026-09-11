import { redirect } from "next/navigation";

/** Moved to /templates/whatsapp/new. */
export default async function OldNewWaTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  redirect(`/templates/whatsapp/new${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`);
}

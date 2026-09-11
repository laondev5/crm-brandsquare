import { redirect } from "next/navigation";

/** Each kind of template has its own page now, under the Templates menu.
 *  Old links -- /templates and /templates?tab=email -- still land right. */
export default async function TemplatesIndex({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; created?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "email" || sp.tab === "notes" ? sp.tab : "whatsapp";
  redirect(`/templates/${tab}${sp.created ? `?created=${encodeURIComponent(sp.created)}` : ""}`);
}

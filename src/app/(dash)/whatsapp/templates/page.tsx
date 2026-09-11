import { redirect } from "next/navigation";

/** WhatsApp templates now live on the Templates page, beside email and notes. */
export default async function OldWaTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const sp = await searchParams;
  redirect(`/templates/whatsapp${sp.created ? `?created=${encodeURIComponent(sp.created)}` : ""}`);
}

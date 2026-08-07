import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getEmailSettings } from "@/lib/queries";
import SenderForm from "./form";

export default async function EmailSettingsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/email");

  const settings = await getEmailSettings();
  return <SenderForm settings={settings} />;
}

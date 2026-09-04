import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/types";
import { currentUser } from "@/lib/auth";
import { getEmailSettings } from "@/lib/queries";
import SenderForm from "./form";

export default async function EmailSettingsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!isAdminRole(me.role)) redirect("/email");

  const settings = await getEmailSettings();
  return <SenderForm settings={settings} />;
}

import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/types";
import EmailTabs from "../email-tabs";

export default async function EmailLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return (
    <>
      <EmailTabs isAdmin={isAdminRole(me.role)} />
      {children}
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { teamPeople } from "@/lib/queries";
import { hasPermission, isAdminRole } from "@/lib/types";
import OrganizationForm from "../form";

export default async function NewOrganizationPage() {
  const me = await requireMember();
  if (!isAdminRole(me.role) && !(me.role === "subadmin" && hasPermission(me, "add_leads"))) notFound();

  const owners = isAdminRole(me.role) ? await teamPeople().catch(() => []) : [];

  return (
    <>
      <div className="head">
        <h1>Create company</h1>
        <div className="spacer" />
        <Link href="/organizations" className="btn ghost">
          All companies
        </Link>
      </div>

      <OrganizationForm owners={owners} canAssignOwner={isAdminRole(me.role)} />
    </>
  );
}

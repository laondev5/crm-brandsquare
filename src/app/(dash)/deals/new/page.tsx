import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getDocSettings,
  getPipeline,
  listLeads,
  listOrganizations,
  teamPeople,
} from "@/lib/queries";
import { hasPermission, isAdminRole } from "@/lib/types";
import DealForm from "../form";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; lead?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireUser();
  const admin = isAdminRole(me.role);
  if (!admin && !(me.role === "subadmin" && hasPermission(me, "add_leads"))) redirect("/deals");
  const orgId = Number(sp.org) || null;
  const leadId = Number(sp.lead) || null;

  const [pipeline, orgs, leads, owners, settings] = await Promise.all([
    getPipeline(),
    listOrganizations(me).catch(() => null),
    listLeads({ page: 1, perPage: 200, ownerId: admin ? null : me.id }).catch(() => null),
    admin ? teamPeople().catch(() => []) : Promise.resolve([]),
    getDocSettings().catch(() => null),
  ]);

  return (
    <>
      <div className="head">
        <h1>New deal</h1>
        <div className="spacer" />
        <Link href="/deals" className="btn ghost">
          All deals
        </Link>
      </div>

      <DealForm
        stages={pipeline.stages}
        organizations={(orgs?.organizations ?? []).map((o) => ({ id: o.id, name: o.name, hint: o.ref }))}
        leads={(leads?.rows ?? []).map((l) => ({ id: l.id, name: l.name, hint: l.company }))}
        owners={owners}
        canAssignOwner={admin}
        defaultCurrency={settings?.settings.default_currency ?? "NGN"}
        defaultOrgId={orgId}
        defaultLeadId={leadId}
      />
    </>
  );
}

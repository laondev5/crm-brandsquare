import { requireUser } from "@/lib/auth";
import { assignableStaff, getLeadProperties, getPipeline, listCampaigns } from "@/lib/queries";
import AddLeadForm from "./form";
import { isAdminRole } from "@/lib/types";

export default async function NewLeadPage() {
  const me = await requireUser();

  const [campaigns, subs, pipeline, properties] = await Promise.all([
    listCampaigns(1, 100).then((r) => r.rows).catch(() => []),
    isAdminRole(me.role) ? assignableStaff().catch(() => []) : Promise.resolve([]),
    getPipeline(),
    getLeadProperties(),
  ]);

  return (
    <AddLeadForm
      campaigns={campaigns}
      subs={subs}
      isAdmin={isAdminRole(me.role)}
      pipeline={pipeline}
      properties={properties}
    />
  );
}

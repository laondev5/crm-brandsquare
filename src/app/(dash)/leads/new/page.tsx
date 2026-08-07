import { requireUser } from "@/lib/auth";
import { allSubadmins, listCampaigns } from "@/lib/queries";
import AddLeadForm from "./form";

export default async function NewLeadPage() {
  const me = await requireUser();

  const [campaigns, subs] = await Promise.all([
    listCampaigns(1, 100).then((r) => r.rows).catch(() => []),
    me.role === "admin" ? allSubadmins() : Promise.resolve([]),
  ]);

  return <AddLeadForm campaigns={campaigns} subs={subs} isAdmin={me.role === "admin"} />;
}

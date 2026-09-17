import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/types";
import { getLeadProperties, listCampaigns } from "@/lib/queries";
import Importer from "./importer";

export default async function ImportLeadsPage() {
  const me = await requireUser();

  const [campaigns, properties] = await Promise.all([
    listCampaigns(1, 100)
      .then((r) => r.rows)
      .catch(() => []),
    getLeadProperties(),
  ]);

  return <Importer campaigns={campaigns} isAdmin={isAdminRole(me.role)} properties={properties} />;
}

import { requireUser } from "@/lib/auth";
import { listCampaigns } from "@/lib/queries";
import Importer from "./importer";

export default async function ImportLeadsPage() {
  const me = await requireUser();

  const campaigns = await listCampaigns(1, 100)
    .then((r) => r.rows)
    .catch(() => []);

  return <Importer campaigns={campaigns} isAdmin={me.role === "admin"} />;
}

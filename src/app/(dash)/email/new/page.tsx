import { requireUser } from "@/lib/auth";
import { audiencePreview, getEmailSettings, listCampaigns } from "@/lib/queries";
import Composer from "./composer";

export default async function NewEmailPage() {
  const me = await requireUser();
  const ownerId = me.role === "admin" ? null : me.id;

  const [settings, campaigns] = await Promise.all([
    getEmailSettings(),
    listCampaigns(1, 100)
      .then((r) => r.rows)
      .catch(() => []),
  ]);

  // Reachable counts, not raw lead counts — unsubscribed and address-less
  // leads are already excluded, so the number on screen is what will send.
  const allCount = await audiencePreview({ type: "all", ownerId }).catch(() => ({
    count: 0,
    sample: [],
  }));

  const perForm = await Promise.all(
    campaigns.map(async (c) => ({
      id: c.id,
      name: c.name,
      count: await audiencePreview({ type: "form", formId: c.id, ownerId })
        .then((r) => r.count)
        .catch(() => 0),
    }))
  );

  return (
    <Composer
      blocks={settings.blocks_default}
      fromEmail={settings.from_email}
      fromName={settings.from_name}
      allCount={allCount.count}
      sample={allCount.sample}
      campaigns={perForm}
      isAdmin={me.role === "admin"}
    />
  );
}

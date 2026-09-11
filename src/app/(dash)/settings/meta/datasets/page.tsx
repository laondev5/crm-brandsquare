import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { getPipeline, listCampaigns, listMetaDatasets, listSites } from "@/lib/queries";
import DatasetList from "../dataset-list";

/**
 * The connections themselves: which Meta datasets this CRM reports into.
 *
 * Kept apart from the Ads screen on purpose. This page is set-up — visited
 * when a campaign starts and rarely again — while that one is something you
 * check while a campaign is running. Putting the credentials above the
 * numbers made you scroll past the plumbing every time you wanted the result.
 */
export default async function MetaDatasetsPage() {
  const me = await requireSuperAdmin();

  const [meta, campaigns, sites, pipeline] = await Promise.all([
    listMetaDatasets(me).catch(() => ({
      datasets: [],
      default_source: "",
      api_version: "v26.0",
    })),
    listCampaigns(1, 100)
      .then((r) => r.rows)
      .catch(() => []),
    listSites(me)
      .then((r) => r.sites)
      .catch(() => []),
    getPipeline(),
  ]);

  return (
    <>
      <div className="head">
        <h1>Ad datasets</h1>
        <div className="spacer" />
        <Link href="/settings/meta" className="btn ghost">
          View reporting
        </Link>
      </div>

      <p className="board-hint">
        Each Meta dataset this CRM reports into. Add one per ad account or campaign — a new
        campaign gets its own row rather than replacing the one already running. Email and phone
        are hashed before they leave this server; the raw values are never sent.
      </p>

      <DatasetList
        datasets={meta.datasets}
        campaigns={campaigns}
        sites={sites}
        stages={pipeline.stages}
        defaultSource={meta.default_source}
      />
    </>
  );
}

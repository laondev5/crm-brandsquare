import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { getPipeline, listCampaigns, listMetaDatasets, listSites } from "@/lib/queries";
import DatasetList from "../dataset-list";
import HowTo from "@/app/(dash)/templates/how-to";

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

      <HowTo
        title="Setting up Meta ads reporting"
        steps={[
          {
            title: "Open your dataset in Meta",
            body: (
              <>
                Go to <strong>business.facebook.com → Events Manager</strong> and open the dataset
                (pixel) your ads use. If you have none, press <strong>Connect data sources</strong>{" "}
                and create one.
              </>
            ),
          },
          {
            title: "Copy the Dataset ID and an access token",
            body: (
              <>
                In the dataset&rsquo;s <strong>Settings</strong>, copy the <strong>Dataset ID</strong>{" "}
                (the long number). Under <strong>Conversions API</strong>, press{" "}
                <strong>Generate access token</strong> and copy it — Meta shows it only once.
              </>
            ),
          },
          {
            title: "Add it here",
            body: (
              <>
                Press <strong>+ Add a dataset</strong>. Name it after the campaign, paste the Dataset
                ID (pasting the whole endpoint address works too) and the access token. The token
                is stored encrypted and never shown again.
              </>
            ),
          },
          {
            title: "Choose which leads it covers",
            body: (
              <>
                Leave <strong>Every campaign</strong> and <strong>Every website</strong> to report
                all leads, or pick one of each to keep a separate ad account&rsquo;s results
                apart.
              </>
            ),
          },
          {
            title: "Choose the stages to report",
            body: (
              <>
                Tick the pipeline stages Meta should hear about — for example New, Contacted,
                Quotation sent and Won — or leave them all unticked to send every stage. Each time a
                lead moves into a ticked stage, the CRM tells Meta.
              </>
            ),
          },
          {
            title: "Test before going live",
            body: (
              <>
                In Events Manager open <strong>Test events</strong> and copy the test code (like{" "}
                <code>TEST12345</code>). Paste it into <strong>Test event code</strong> and save,
                then press <strong>Send test event</strong>. It should appear in Meta&rsquo;s Test
                events tab within a minute or two.
              </>
            ),
          },
          {
            title: "Go live",
            body: (
              <>
                Press <strong>Edit</strong>, clear the Test event code and save. The{" "}
                <em>Test mode</em> label disappears and real events start counting.
              </>
            ),
          },
          {
            title: "Check it is working",
            body: (
              <>
                <Link href="/settings/meta">Ads</Link> shows what was sent over the last 14 days and
                a log of each event. Events go out every 15 minutes on their own; press{" "}
                <strong>Send now</strong> to push them at once. If Meta refused any, fix the cause
                (usually an expired token — paste a new one under Edit) and press{" "}
                <strong>Retry failed</strong>.
              </>
            ),
          },
          {
            title: "Know what gets matched",
            body: (
              <>
                Only leads with an email, phone or name are reported, and those details are
                scrambled (hashed) before they leave — the real values are never sent. Leads from a
                Meta lead form, or who clicked your ad before filling in the site form, match best.
              </>
            ),
          },
          {
            title: "Next campaign",
            body: (
              <>
                Add another dataset rather than changing this one, so each campaign keeps its own
                history. Use <strong>Pause</strong> to stop reporting to a dataset without losing
                it.
              </>
            ),
          },
        ]}
      />

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

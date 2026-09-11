import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { listMetaDatasets, listMetaEvents } from "@/lib/queries";
import EventsChart from "./events-chart";
import EventsTable from "./events-table";

/**
 * Meta ads reporting.
 *
 * Meta already knows it sold you the click. What it cannot see is that the
 * click became a quotation and then a deposit — so left alone it optimises
 * towards ads that produce form fills rather than ads that produce deals.
 * This screen is where you check that loop is actually closing.
 *
 * Set-up lives next door under Ad datasets: this page is for the numbers, and
 * the credentials should not be sitting above them every time you look.
 */
export default async function MetaAdsPage() {
  // Reads which ad accounts exist and what has been sent to them.
  const me = await requireSuperAdmin();

  const [meta, log] = await Promise.all([
    listMetaDatasets(me).catch(() => ({
      datasets: [],
      default_source: "",
      api_version: "v26.0",
    })),
    // Enough history to draw a fortnight and still page through the log.
    listMetaEvents(me, undefined, 500)
      .then((r) => r.events)
      .catch(() => []),
  ]);

  const accepted = log.filter((e) => e.status === "sent").length;
  const waiting = log.filter((e) => e.status === "pending").length;
  const refused = log.filter((e) => e.status === "failed").length;
  const datasetNames = [...new Set(log.map((e) => e.dataset).filter(Boolean))] as string[];

  const live = meta.datasets.filter((d) => d.status === "active").length;
  const broken = meta.datasets.filter((d) => d.last_error).length;

  return (
    <>
      <div className="head">
        <h1>Meta ads</h1>
        <div className="spacer" />
        {meta.datasets.length > 0 && (
          <span className="board-legend">
            <b>{live}</b> dataset{live === 1 ? "" : "s"} reporting
          </span>
        )}
        <Link href="/settings/meta/datasets" className="btn ghost">
          Manage datasets
        </Link>
      </div>

      {meta.datasets.length === 0 ? (
        <div className="card">
          <p className="empty">
            No datasets connected yet, so nothing is being reported to Meta.
          </p>
          <div style={{ textAlign: "center", paddingBottom: 18 }}>
            <Link href="/settings/meta/datasets" className="btn">
              Connect a dataset
            </Link>
          </div>
        </div>
      ) : (
        <>
          {broken > 0 && (
            <div className="msg err">
              <strong>
                {broken} dataset{broken === 1 ? "" : "s"}
              </strong>{" "}
              last had an error from Meta.{" "}
              <Link href="/settings/meta/datasets">See what it said</Link>
            </div>
          )}

          {/* The three numbers worth knowing before trusting a campaign’s
              figures: how much got through, how much is still queued, and how
              much Meta would not take. */}
          <div className="stats">
            <div className="stat t-won">
              <span>Accepted</span>
              <b>{accepted.toLocaleString()}</b>
            </div>
            <div className="stat t-open">
              <span>Waiting</span>
              <b>{waiting.toLocaleString()}</b>
            </div>
            <div className={refused > 0 ? "stat t-overdue" : "stat t-total"}>
              <span>Refused by Meta</span>
              <b>{refused.toLocaleString()}</b>
            </div>
          </div>

          <div className="card">
            <h2>Last 14 days</h2>
            <EventsChart events={log} />
          </div>

          <h2 style={{ marginTop: 24 }}>Event log</h2>
          <p className="board-hint">
            Every stage change reported, and what Meta said back. A refusal keeps its message,
            which names the field that was wrong.
          </p>
          <EventsTable events={log} datasets={datasetNames} />
        </>
      )}
    </>
  );
}

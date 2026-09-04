import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { trackerSummary } from "@/lib/queries";
import { TRACKERS } from "@/lib/trackers";
import type { TrackerCounts } from "@/lib/types";
import { isAdminRole } from "@/lib/types";

export default async function TrackerHub() {
  const me = await requireUser();
  const scope = isAdminRole(me.role) ? null : me.id;

  // One request for all eight counts. If it fails the hub still renders — you
  // can always reach a tracker, you just don't see its workload yet.
  let summary: Record<string, TrackerCounts> = {};
  let failed = false;
  try {
    summary = await trackerSummary(scope);
  } catch {
    failed = true;
  }

  const totals = Object.values(summary).reduce(
    (a, c) => ({ open: a.open + c.open, overdue: a.overdue + c.overdue }),
    { open: 0, overdue: 0 }
  );

  return (
    <>
      <div className="head">
        <h1>Trackers</h1>
        <div className="spacer" />
        {!failed && (
          <span className="board-legend">
            <b>{totals.open}</b> open
            {totals.overdue > 0 && (
              <>
                {" · "}
                <b className="is-rot">{totals.overdue}</b> overdue
              </>
            )}
          </span>
        )}
      </div>

      {failed && (
        <div className="msg err">
          Could not load tracker counts. The trackers themselves still open normally.
        </div>
      )}

      <p className="board-hint">
        Your own work, coordination and reporting. Leads and customer records stay in the CRM —
        these are for everything around them.
      </p>

      <div className="tk-hub">
        {TRACKERS.map((t) => {
          const c = summary[t.key];
          return (
            <Link key={t.key} href={`/tracker/${t.key}`} className="tk-hub__card">
              <h2>{t.label}</h2>
              <p>{t.blurb}</p>
              <div className="tk-hub__counts">
                {c ? (
                  <>
                    <span>
                      <b>{c.open}</b> open
                    </span>
                    {c.overdue > 0 && (
                      <span className="is-over">
                        <b>{c.overdue}</b> overdue
                      </span>
                    )}
                    <span className="tk-hub__all">{c.total} total</span>
                  </>
                ) : (
                  <span className="tk-hub__all">No entries yet</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

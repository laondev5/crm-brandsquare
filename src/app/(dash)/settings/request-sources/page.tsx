import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { machineRequestMeta } from "@/lib/queries";
import { MR_SOURCES } from "@/lib/types";
import SourceEditor from "./editor";

/**
 * The source list behind every machine request.
 *
 * An admin's, not a developer's: a new channel should be a line typed here,
 * not a plugin release.
 */
export default async function RequestSourcesPage() {
  const me = await requireAdmin();
  const meta = await machineRequestMeta(me).catch(() => null);
  const sources = meta?.sources ?? MR_SOURCES.map((s) => ({ key: s.key, label: s.label }));

  return (
    <>
      <div className="head">
        <h1>Request sources</h1>
        <div className="spacer" />
        <Link href="/requests" className="btn ghost">
          Machine requests
        </Link>
      </div>

      <p className="board-hint">
        The <strong>Where did it come from?</strong> list on a machine request. Add your own, rename
        them, and drag the busiest to the top with the arrows.
      </p>

      {!meta && (
        <div className="msg err">
          Could not load the saved list, so the built-in one is shown. The plugin needs to be version
          1.31 or newer to save changes.
        </div>
      )}

      <SourceEditor initial={sources} />
    </>
  );
}

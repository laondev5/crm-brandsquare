import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listTrackerRecords } from "@/lib/queries";
import { getTracker } from "@/lib/trackers";
import type { TrackerRecord } from "@/lib/types";
import TrackerView from "./view";

export default async function TrackerPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ status?: string; s?: string; page?: string }>;
}) {
  const { key } = await params;
  const def = getTracker(key);
  if (!def) notFound();

  const sp = await searchParams;
  const me = await requireUser();
  const scope = me.role === "admin" ? null : me.id;

  const page = Number(sp.page) || 1;

  let rows: TrackerRecord[] = [];
  let total = 0;
  let pages = 1;
  let failed = false;

  try {
    const res = await listTrackerRecords({
      tracker: def.key,
      status: sp.status,
      search: sp.s,
      ownerId: scope,
      page,
    });
    rows = res.rows;
    total = res.total;
    pages = res.pages;
  } catch {
    failed = true;
  }

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ status: sp.status, s: sp.s, ...over }).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const str = p.toString();
    return str ? `/tracker/${def.key}?${str}` : `/tracker/${def.key}`;
  };

  const tabs = [
    { key: "", label: "All" },
    { key: "open", label: "Open" },
    { key: "overdue", label: "Overdue" },
    ...def.statuses.map((s) => ({ key: s, label: s })),
  ];

  return (
    <>
      <div className="head">
        <h1>{def.label}</h1>
        <div className="spacer" />
        <form className="row" action={`/tracker/${def.key}`}>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input
            type="search"
            name="s"
            defaultValue={sp.s ?? ""}
            placeholder="Search this tracker…"
            style={{ width: 240 }}
          />
          <button className="btn ghost">Search</button>
        </form>
      </div>

      <div className="tk-crumbs">
        <Link href="/tracker">All trackers</Link>
        <span aria-hidden="true">›</span>
        <b>{def.label}</b>
      </div>

      <p className="board-hint">{def.blurb}</p>

      <div className="tabs">
        {tabs.map((t) => (
          <Link
            key={t.key || "all"}
            href={qs({ status: t.key || undefined, page: undefined })}
            className={(sp.status ?? "") === t.key ? "on" : ""}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {failed ? (
        <div className="msg err">
          Could not load this tracker. Check that the CRM can reach WordPress, then reload.
        </div>
      ) : (
        <TrackerView def={def} rows={rows} canSeeOwner={me.role === "admin"} />
      )}

      {pages > 1 && (
        <div className="row" style={{ marginTop: 16, justifyContent: "center" }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={qs({ page: String(n) })} className={`btn ${n === page ? "" : "ghost"}`}>
              {n}
            </Link>
          ))}
        </div>
      )}

      {!failed && (
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 14 }}>
          {total} entr{total === 1 ? "y" : "ies"}
        </p>
      )}
    </>
  );
}

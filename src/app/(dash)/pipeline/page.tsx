import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPipeline, listLeads } from "@/lib/queries";
import { weightedOpen, type LeadStatus, isAdminRole } from "@/lib/types";
import Board, { type BoardColumn } from "./board";

/** How many cards are rendered per column before it says "+N more". */
const PER_COLUMN = 40;

/** Days a lead can sit untouched in an open stage before the card is flagged. */
const ROT_WARN = 7;
const ROT_STALE = 14;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const sp = await searchParams;
  const term = (sp.s ?? "").trim();

  const me = await requireUser();
  const scope = isAdminRole(me.role) ? null : me.id;

  // One request per stage, in parallel. Fetching every lead and grouping in
  // memory would work today and quietly stop working once the pipeline is
  // bigger than one page — this way each column carries its own true total
  // even though only the first PER_COLUMN cards are rendered.
  //
  // Search goes to the server for the same reason: filtering the loaded cards
  // in the browser would only ever search the 40 per column already on screen
  // and quietly miss matches sitting behind a "+N more".
  const pipeline = await getPipeline();

  const results = await Promise.all(
    pipeline.stages.map((s) =>
      listLeads({
        status: s.key,
        search: term || undefined,
        ownerId: scope,
        perPage: PER_COLUMN,
        page: 1,
      })
        .then((r) => ({ ok: true as const, ...r }))
        .catch(() => ({ ok: false as const, rows: [], total: 0, pages: 0, page: 1 }))
    )
  );

  const now = Date.now();
  const idleDays = (iso: string) => {
    const t = new Date(iso.replace(" ", "T")).getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((now - t) / 86_400_000));
  };

  const columns: BoardColumn[] = pipeline.stages.map((s, i) => {
    const r = results[i];
    const open = s.type === "open";
    return {
      key: s.key,
      label: s.label,
      colour: s.colour,
      probability: s.probability,
      total: r.total,
      failed: !r.ok,
      cards: r.rows.map((l) => {
        const idle = idleDays(l.updated_at || l.created_at);
        return {
          id: l.id,
          name: l.name || "(no name)",
          email: l.email,
          phone: l.phone,
          owner: l.owner,
          formName: l.form_name,
          status: l.status as LeadStatus,
          received: fmtDate(l.created_at),
          idleDays: idle,
          // Won and lost are terminal — a closed deal sitting still is not rot.
          rot: !open ? "none" : idle >= ROT_STALE ? "stale" : idle >= ROT_WARN ? "warn" : "none",
        };
      }),
    };
  });

  const anyFailed = columns.some((c) => c.failed);
  const openKeys = new Set(pipeline.open);
  const totalOpen = columns.filter((c) => openKeys.has(c.key)).reduce((n, c) => n + c.total, 0);

  // Weighted by each stage's probability: ten leads sitting in Qualification
  // are not the same prospect as ten at Deposit Received. With no deal values
  // yet this forecasts how many should close, not what they are worth.
  const byStage: Record<string, number> = {};
  for (const c of columns) byStage[c.key] = c.total;
  const forecast = weightedOpen(pipeline, byStage);
  const rotting = columns.reduce(
    (n, c) => n + c.cards.filter((card) => card.rot !== "none").length,
    0
  );
  const matches = columns.reduce((n, c) => n + c.total, 0);

  return (
    <>
      <div className="head">
        <h1>Pipeline</h1>
        <div className="spacer" />
        <span className="board-legend">
          <b>{totalOpen}</b> open
          {" · "}
          <b title="Open leads weighted by each stage's probability of closing">
            {forecast}
          </b>{" "}
          forecast
          {rotting > 0 && (
            <>
              {" · "}
              <b className="is-rot">{rotting}</b> needing attention
            </>
          )}
        </span>
        <form className="row" action="/pipeline">
          <input
            type="search"
            name="s"
            defaultValue={term}
            placeholder="Search name, email, phone, answers…"
            style={{ width: 260 }}
            aria-label="Search the pipeline"
          />
          <button className="btn ghost">Search</button>
        </form>
      </div>

      {anyFailed && (
        <div className="msg err">
          Some stages could not be loaded. What you see below may be incomplete.
        </div>
      )}

      {term ? (
        <div className="msg ok" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>
            {matches === 0 ? (
              <>
                Nothing matches <strong>{term}</strong>.
              </>
            ) : (
              <>
                Showing {matches} match{matches === 1 ? "" : "es"} for <strong>{term}</strong>,
                still grouped by stage.
              </>
            )}
          </span>
          <Link href="/pipeline" style={{ fontWeight: 600 }}>
            Clear
          </Link>
        </div>
      ) : (
        <p className="board-hint">
          Drag a card to another stage to move the lead. Changes save to the CRM straight away.
        </p>
      )}

      <Board columns={columns} pipeline={pipeline} canReassign={isAdminRole(me.role)} searchTerm={term} />
    </>
  );
}

function fmtDate(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

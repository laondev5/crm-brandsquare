import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listDeals, listViews, teamPeople } from "@/lib/queries";
import { hasPermission, isAdminRole, money } from "@/lib/types";
import DealsBoard, { type DealColumn } from "./board";
import ViewsBar from "../leads/views-bar";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; stage?: string; owner?: string; q?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireUser();
  const admin = isAdminRole(me.role);
  const canAdd = admin || (me.role === "subadmin" && hasPermission(me, "add_leads"));
  const asList = sp.view === "list";
  const term = (sp.q ?? "").trim();
  const stage = sp.stage ?? "";
  const owner = Number(sp.owner) || undefined;
  const sort = (["recent", "amount", "close", "created"] as const).includes(
    sp.sort as "recent" | "amount" | "close" | "created"
  )
    ? (sp.sort as "recent" | "amount" | "close" | "created")
    : "recent";

  const [data, owners, views] = await Promise.all([
    listDeals(me, { stage: stage || undefined, owner, q: term || undefined, sort }).catch(() => null),
    admin ? teamPeople().catch(() => []) : Promise.resolve([]),
    listViews("deals").catch(() => []),
  ]);

  const currentQuery = new URLSearchParams({
    ...(sp.view ? { view: sp.view } : {}),
    ...(stage ? { stage } : {}),
    ...(sp.owner ? { owner: sp.owner } : {}),
    ...(term ? { q: term } : {}),
    ...(sort !== "recent" ? { sort } : {}),
  }).toString();

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      view: sp.view,
      stage: stage || undefined,
      owner: sp.owner,
      q: term || undefined,
      sort: sort !== "recent" ? sort : undefined,
      ...over,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const str = p.toString();
    return str ? `/deals?${str}` : "/deals";
  };

  const columns: DealColumn[] = (data?.stages ?? []).map((s) => ({
    stage: s,
    total: data?.counts[s.key] ?? 0,
    value: data?.values[s.key] ?? 0,
    deals: (data?.deals ?? []).filter((d) => d.stage === s.key),
  }));
  const openKeys = new Set((data?.stages ?? []).filter((s) => s.type === "open").map((s) => s.key));
  const openCount = columns.filter((c) => openKeys.has(c.stage.key)).reduce((n, c) => n + c.total, 0);
  const won = columns.find((c) => c.stage.type === "won");

  return (
    <>
      <div className="head">
        <h1>Deals</h1>
        <div className="spacer" />
        <span className="board-legend">
          <b>{data?.open_value ? money(data.open_value, data.deals[0]?.currency ?? "NGN") : "—"}</b> in play
          {" · "}
          <b>{openCount}</b> open
          {won && won.total > 0 && (
            <>
              {" · "}
              <b>{won.total}</b> won
            </>
          )}
        </span>
        {canAdd && (
          <Link href="/deals/new" className="btn">
            + New deal
          </Link>
        )}
      </div>

      <p className="board-hint">
        The money side of a conversation: who is buying, how much, and how far along it is. A deal
        hangs off an organisation or a lead, and its quotation, invoice and receipts live on the
        same page.
      </p>

      <div className="row" style={{ gap: 10, marginBottom: 10 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <Link href={qs({ view: undefined })} className={asList ? "" : "on"}>
            Board
          </Link>
          <Link href={qs({ view: "list" })} className={asList ? "on" : ""}>
            List
          </Link>
        </div>
        <div style={{ flex: 1 }} />
        <ViewsBar views={views} currentQuery={currentQuery} scope="deals" basePath="/deals" />
      </div>

      <form className="row" style={{ gap: 8, marginBottom: 14 }}>
        {asList && <input type="hidden" name="view" value="list" />}
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search a deal, customer or source"
          style={{ flex: 1, maxWidth: 340 }}
          aria-label="Search deals"
        />
        {asList && (
          <select name="stage" defaultValue={stage} style={{ width: "auto" }}>
            <option value="">Every stage</option>
            {(data?.stages ?? []).map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        {admin && (
          <select name="owner" defaultValue={sp.owner ?? ""} style={{ width: "auto" }}>
            <option value="">Every owner</option>
            {owners.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
        <select name="sort" defaultValue={sort} style={{ width: "auto" }}>
          <option value="recent">Recently active</option>
          <option value="amount">Biggest first</option>
          <option value="close">Soonest close</option>
          <option value="created">Newest added</option>
        </select>
        <button className="btn ghost sm">Filter</button>
      </form>

      {!data ? (
        <div className="msg err">
          Could not load deals. The plugin needs to be version 1.39 or newer.
        </div>
      ) : asList ? (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Stage</th>
                <th>Customer</th>
                <th>Owner</th>
                <th>Close date</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.deals.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="empty" style={{ padding: 24, margin: 0 }}>
                      {term || stage ? "No deal matches that." : "No deals yet. Add one to start the board."}
                    </p>
                  </td>
                </tr>
              ) : (
                data.deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link href={`/deals/${deal.id}`} className="name">
                        {deal.title}
                      </Link>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{deal.ref}</small>
                    </td>
                    <td className="tbl-keep">
                      <span
                        className="pill"
                        style={{
                          background: `${deal.stage_colour}1a`,
                          color: deal.stage_colour,
                        }}
                      >
                        {deal.stage_label}
                      </span>
                    </td>
                    <td>
                      {deal.org_id ? (
                        <Link href={`/organizations/${deal.org_id}`}>{deal.org_name}</Link>
                      ) : deal.lead_id ? (
                        <Link href={`/leads/${deal.lead_id}`}>{deal.lead_name || deal.lead_company}</Link>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td className="tbl-keep">{deal.owner || "—"}</td>
                    <td className="tbl-keep">{deal.close_date?.slice(0, 10) || "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                      {money(deal.amount, deal.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <DealsBoard columns={columns} />
      )}
    </>
  );
}

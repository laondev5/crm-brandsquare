import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listMachineRequests, listPeopleNames } from "@/lib/queries";
import { orBlank, type MachineRequestCounts } from "@/lib/types";
import NewRequest from "./new-request";
import StatusControls from "./status-pills";

/** The saved views, in the order procurement works them. */
const VIEWS = [
  { key: "open", label: "Open" },
  { key: "", label: "All requests" },
  { key: "new", label: "New requests" },
  { key: "sourcing", label: "Currently sourcing" },
  { key: "breakdown_pending", label: "Breakdown pending" },
  { key: "breakdown_ready", label: "Breakdown ready" },
  { key: "sent_to_sales", label: "Sent to sales" },
  { key: "completed", label: "Completed" },
];

function when(s: string | null) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const count = (c: MachineRequestCounts, key: string) => (key === "" ? c.all : c[key]) ?? 0;

/**
 * Machine requests, in the queue whoever is looking after.
 *
 * Sales open "Breakdown ready" or "Sent to sales" and see what is theirs to
 * act on, instead of asking which WhatsApp conversation the request was in.
 */
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; mine?: string; page?: string; new?: string }>;
}) {
  // Everyone who works requests, plus the MD, who reads them like any other
  // report. Authors have no business here.
  const me = await requireMember();
  if (me.role === "author") redirect("/blog");
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.key === (sp.view ?? "")) ? sp.view ?? "open" : "open";
  const q = (sp.q ?? "").trim();
  const mine = sp.mine === "1";
  const page = Number(sp.page) || 1;

  const [data, people] = await Promise.all([
    listMachineRequests(me, { view, q, mine, page }).catch(() => null),
    listPeopleNames().catch(() => []),
  ]);

  const href = (o: { view?: string; q?: string; mine?: boolean; page?: number }) => {
    const p = new URLSearchParams();
    const v = o.view ?? view;
    if (v && v !== "open") p.set("view", v);
    if (v === "") p.set("view", "");
    const s = o.q ?? q;
    if (s) p.set("q", s);
    if (o.mine ?? mine) p.set("mine", "1");
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const qs = p.toString();
    return `/requests${qs ? `?${qs}` : ""}`;
  };

  const rows = data?.requests ?? [];
  const counts = data?.counts ?? {};
  const canEdit = data?.can_edit ?? false;

  return (
    <>
      <div className="head">
        <h1>Machine requests</h1>
        {data && (
          <span className="board-legend">
            <b>{counts.open ?? 0}</b> open · <b>{counts.all ?? 0}</b> in total
          </span>
        )}
        <div className="spacer" />
        <form action="/requests" className="row" style={{ gap: 6 }}>
          {view && view !== "open" && <input type="hidden" name="view" value={view} />}
          {mine && <input type="hidden" name="mine" value="1" />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Phone, name, company, machine…"
            aria-label="Search machine requests"
            style={{ width: 240 }}
          />
          <button className="btn ghost">Search</button>
        </form>
      </div>

      {!data && (
        <div className="msg err">
          Could not load machine requests. The Brandsquare plugin on the website needs to be version
          1.30 or newer.
        </div>
      )}

      {canEdit && <NewRequest people={people} openAtStart={sp.new === "1"} />}

      <div className="tabs mr-views">
        {VIEWS.map((v) => (
          <Link key={v.key || "all"} href={href({ view: v.key, page: 1 })} className={v.key === view ? "on" : ""}>
            {v.label}
            <span className="mr-views__n">{count(counts, v.key)}</span>
          </Link>
        ))}
        <Link href={href({ mine: !mine, page: 1 })} className={mine ? "on" : ""} style={{ marginLeft: "auto" }}>
          {mine ? "Mine only ✓" : "Mine only"}
        </Link>
      </div>

      {q && (
        <p className="board-hint">
          Showing matches for <strong>{q}</strong>. <Link href={href({ q: "" })}>Clear search</Link>
        </p>
      )}

      {data && rows.length === 0 ? (
        <div className="card">
          <p className="empty">
            {q ? "Nothing matches that search." : "Nothing in this view yet."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
          <table className="tbl tbl-keep" style={{ minWidth: 1080 }}>
            <thead>
              <tr>
                <th style={{ width: 82 }}>Ref</th>
                <th style={{ width: 180 }}>Customer</th>
                <th>Machine</th>
                <th style={{ width: 210 }}>Status</th>
                <th style={{ width: 150 }}>With</th>
                <th>Last update / next action</th>
                <th style={{ width: 96 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-l="Ref">
                    <Link href={`/requests/${r.id}`} className="name">
                      {r.ref}
                    </Link>
                    <small style={{ display: "block", color: "var(--muted)" }}>{r.source_label}</small>
                  </td>
                  <td data-l="Customer">
                    <a href={`tel:${r.phone}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {r.phone}
                    </a>
                    <small style={{ display: "block", color: r.name ? "var(--txt)" : "var(--muted)" }}>
                      {r.name || "Name not provided"}
                      {r.company ? ` · ${r.company}` : ""}
                    </small>
                  </td>
                  <td data-l="Machine">
                    <strong style={{ color: "var(--ink)" }}>{r.machine || "Not stated"}</strong>
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      {[r.capacity, r.requirements].filter(Boolean).join(" · ").slice(0, 90) || "—"}
                    </small>
                  </td>
                  <td data-l="Status">
                    <StatusControls r={r} canEdit={canEdit} compact />
                  </td>
                  <td data-l="With">
                    <small style={{ display: "block" }}>
                      <span style={{ color: "var(--muted)" }}>Proc:</span>{" "}
                      {r.procurement_name || "Unassigned"}
                    </small>
                    <small style={{ display: "block" }}>
                      <span style={{ color: "var(--muted)" }}>Sales:</span> {r.sales_name || "Unassigned"}
                    </small>
                  </td>
                  <td data-l="Update">
                    <small style={{ display: "block" }}>{r.last_update || "—"}</small>
                    {r.next_action && (
                      <small style={{ display: "block", color: "var(--pd)", fontWeight: 600 }}>
                        Next: {r.next_action}
                      </small>
                    )}
                  </td>
                  <td data-l="Updated" style={{ whiteSpace: "nowrap" }}>
                    {when(r.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="row" style={{ margin: "14px 0", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={href({ page: n })} className={`btn ${n === data.page ? "" : "ghost"} sm`}>
              {n}
            </Link>
          ))}
        </div>
      )}

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 14, maxWidth: 760 }}>
        A request only needs a phone number. {orBlank("")} is shown wherever the customer has not
        given a detail yet — open the request and fill it in when they do.
      </p>
    </>
  );
}

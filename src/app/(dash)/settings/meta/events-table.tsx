"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MetaEvent } from "@/lib/types";

const PER_PAGE = 15;

const STATUS_LABEL: Record<MetaEvent["status"], string> = {
  sent: "Accepted",
  failed: "Refused",
  pending: "Waiting",
  cancelled: "Cancelled",
};

function fmt(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/**
 * The event log, as something you can actually work through.
 *
 * Refused first by default when there are any: a log you scroll to find the
 * failures buries the only rows that need a person. Errors are shown in full
 * on their own row rather than truncated into a column, because Meta's message
 * names the field that is wrong and half of it is no use.
 */
export default function EventsTable({
  events,
  datasets,
  linkLeads = true,
}: {
  events: MetaEvent[];
  datasets: string[];
  /** Off for authors, who read the report but have no access to leads. */
  linkLeads?: boolean;
}) {
  const failedCount = events.filter((e) => e.status === "failed").length;

  const [status, setStatus] = useState<"all" | MetaEvent["status"]>(
    failedCount > 0 ? "failed" : "all"
  );
  const [dataset, setDataset] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      events.filter(
        (e) => (status === "all" || e.status === status) && (!dataset || e.dataset === dataset)
      ),
    [events, status, dataset]
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  // Clamped rather than corrected with setState: changing a filter can leave
  // `page` past the end, and fixing that during render is how you get a loop.
  // Deriving it means the last page simply shows instead.
  const safePage = Math.min(page, pageCount);
  const visible = rows.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const counts = {
    all: events.length,
    sent: events.filter((e) => e.status === "sent").length,
    failed: failedCount,
    pending: events.filter((e) => e.status === "pending").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
  };

  const tab = (key: typeof status, label: string, n: number) =>
    n === 0 && key !== "all" ? null : (
      <button
        key={key}
        className={status === key ? "on" : ""}
        onClick={() => {
          setStatus(key);
          setPage(1);
        }}
      >
        {label} <span style={{ opacity: 0.6 }}>{n}</span>
      </button>
    );

  return (
    <>
      <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {tab("all", "All", counts.all)}
          {tab("failed", "Refused", counts.failed)}
          {tab("pending", "Waiting", counts.pending)}
          {tab("sent", "Accepted", counts.sent)}
          {tab("cancelled", "Cancelled", counts.cancelled)}
        </div>

        {datasets.length > 1 && (
          <select
            value={dataset}
            aria-label="Filter by dataset"
            style={{ width: 200 }}
            onChange={(e) => {
              setDataset(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Every dataset</option>
            {datasets.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="empty">Nothing here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 8px", marginTop: 12, overflowX: "auto" }}>
          {/* One column per detail, and a table on a phone too (it scrolls
              sideways), so the log can be read and copied like a sheet. */}
          <table className="tbl tbl-keep" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Company</th>
                <th>Campaign</th>
                <th>Owner</th>
                <th>Stage reported</th>
                <th style={{ width: 100 }}>Meta</th>
                {datasets.length > 1 && <th>Dataset</th>}
                <th style={{ width: 130 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => {
                const l = e.lead;
                const label = l ? l.name || "(no name)" : e.lead_id ? `Lead #${e.lead_id}` : "—";
                return (
                  <tr key={e.id}>
                    <td data-l="Name">
                      {e.lead_id && linkLeads ? (
                        <Link href={`/leads/${e.lead_id}`} className="name">
                          {label}
                        </Link>
                      ) : (
                        <strong style={{ color: "var(--ink)" }}>{label}</strong>
                      )}
                      {e.lead_id && (
                        <small style={{ color: "var(--muted)", display: "block" }}>
                          #{e.lead_id}
                          {e.lead === null && " · deleted"}
                        </small>
                      )}
                    </td>
                    <td data-l="Phone" style={{ whiteSpace: "nowrap" }}>
                      {l?.phone ? <a href={`tel:${l.phone}`}>{l.phone}</a> : "—"}
                    </td>
                    <td data-l="Email">
                      {l?.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "—"}
                    </td>
                    <td data-l="Company">{l?.company || "—"}</td>
                    <td data-l="Campaign">{l?.campaign || "—"}</td>
                    <td data-l="Owner">{l?.owner || "Unassigned"}</td>
                    <td data-l="Stage">
                      <strong style={{ color: "var(--ink)" }}>{e.event_name}</strong>
                      {/* The reason is shown in full: Meta's message names the
                          field that is wrong, and half of it is no use. */}
                      {e.error && (
                        <small style={{ color: "var(--err)", display: "block" }}>{e.error}</small>
                      )}
                    </td>
                    <td data-l="Meta">
                      <span
                        className={`pill ${
                          e.status === "sent" ? "s-active" : e.status === "failed" ? "s-disabled" : ""
                        }`}
                      >
                        {STATUS_LABEL[e.status]}
                      </span>
                    </td>
                    {datasets.length > 1 && <td data-l="Dataset">{e.dataset ?? "—"}</td>}
                    <td data-l="When" style={{ whiteSpace: "nowrap" }}>
                      {fmt(e.sent_at ?? e.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* The count shows even on a single page. Hiding the whole footer when
          everything fits made the list look like it had no paging at all,
          and left you guessing how much you were actually looking at. */}
      {rows.length > 0 && (
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center", marginTop: 12 }}
        >
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Showing <b>{(safePage - 1) * PER_PAGE + 1}</b>–
            <b>{Math.min(safePage * PER_PAGE, rows.length)}</b> of <b>{rows.length}</b>{" "}
            event{rows.length === 1 ? "" : "s"}
          </span>
          <span className="row" style={{ gap: 8 }}>
            <button
              className="btn ghost sm"
              disabled={safePage === 1}
              onClick={() => setPage(Math.max(1, safePage - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              Page {safePage} of {pageCount}
            </span>
            <button
              className="btn ghost sm"
              disabled={safePage >= pageCount}
              onClick={() => setPage(Math.min(pageCount, safePage + 1))}
            >
              Next
            </button>
          </span>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMetaDatasetAction,
  flushMetaEventsAction,
  retryMetaEventsAction,
  saveMetaDatasetAction,
  testMetaDatasetAction,
} from "@/app/actions/meta";
import type { Campaign, MetaDataset, Site, Stage } from "@/lib/types";
import DatasetForm from "./dataset-form";

function fmt(d: string | null) {
  if (!d) return "Never";
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * The datasets, and everything you can do to one.
 *
 * A dataset is only trustworthy once it has actually accepted an event, so
 * every row leads with when it last sent and what went wrong if anything did
 * — the two facts you need before believing a campaign's numbers.
 */
export default function DatasetList({
  datasets,
  campaigns,
  sites,
  stages,
  defaultSource,
}: {
  datasets: MetaDataset[];
  campaigns: Campaign[];
  sites: Site[];
  stages: Stage[];
  defaultSource: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();

  const run = (fn: () => Promise<Record<string, unknown>>) => {
    setNote("");
    setErr("");
    start(async () => {
      const res = await fn();
      if ("error" in res) setErr(String(res.error));
      else if (typeof res.note === "string") setNote(res.note);
      router.refresh();
    });
  };

  const pending = datasets.reduce((n, d) => n + d.counts.pending, 0);
  const failed = datasets.reduce((n, d) => n + d.counts.failed, 0);

  return (
    <>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}
      {note && <div className="msg ok">{note}</div>}

      {(pending > 0 || failed > 0) && (
        <div className={failed > 0 ? "msg warn" : "msg"}>
          {/* Say only what is true: "0 waiting · 1 failed" reads like a
              contradiction when the thing you need to act on is the failure. */}
          {pending > 0 && (
            <>
              <strong>{pending}</strong> event{pending === 1 ? "" : "s"} waiting to go
              {failed > 0 && " · "}
            </>
          )}
          {failed > 0 && (
            <>
              <strong>{failed}</strong> event{failed === 1 ? "" : "s"} Meta refused
            </>
          )}
          . {pending > 0 && "Queued events are sent every 15 minutes on their own."}
          {failed > 0 && " Fix the cause, then retry — the events are still here."}
          <span className="row" style={{ gap: 8, marginTop: 8 }}>
            <button
              className="btn ghost sm"
              disabled={busy || pending === 0}
              onClick={() => run(() => flushMetaEventsAction())}
            >
              Send now
            </button>
            {failed > 0 && (
              <button
                className="btn ghost sm"
                disabled={busy}
                onClick={() => run(() => retryMetaEventsAction())}
              >
                Retry failed
              </button>
            )}
          </span>
        </div>
      )}

      {datasets.length === 0 && !adding && (
        <div className="card">
          <p className="empty">
            No datasets yet. Add one and this CRM starts telling Meta what happens to the leads its
            ads produce.
          </p>
        </div>
      )}

      {datasets.map((d) =>
        editing === d.id ? (
          <div key={d.id} style={{ marginBottom: 16 }}>
            <DatasetForm
              existing={d}
              campaigns={campaigns}
              sites={sites}
              stages={stages}
              defaultSource={defaultSource}
              onDone={() => setEditing(null)}
            />
          </div>
        ) : (
          <div className="card" key={d.id} style={{ marginBottom: 16 }}>
            <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{d.name}</h2>
              <span className={`pill ${d.status === "active" ? "s-active" : "s-disabled"}`}>
                {d.status === "active" ? "Active" : "Paused"}
              </span>
              {d.test_code && <span className="pill">Test mode</span>}
              <div style={{ flex: 1 }} />
              <button
                className="btn ghost sm"
                disabled={busy}
                onClick={() => run(() => testMetaDatasetAction(d.id))}
              >
                Send test event
              </button>
              <button className="btn ghost sm" disabled={busy} onClick={() => setEditing(d.id)}>
                Edit
              </button>
              <button
                className="btn ghost sm"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    saveMetaDatasetAction(d.id, { status: d.status === "active" ? "paused" : "active" })
                  )
                }
              >
                {d.status === "active" ? "Pause" : "Resume"}
              </button>
              <button
                className="btn danger sm"
                disabled={busy}
                onClick={() => {
                  const ok = confirm(
                    `Remove ${d.name}? Nothing more is sent to this dataset, and its event history here is deleted. What Meta already received stays with Meta.`
                  );
                  if (ok) run(() => deleteMetaDatasetAction(d.id));
                }}
              >
                Remove
              </button>
            </div>

            {d.last_error && (
              <div className="msg err" style={{ marginTop: 12 }}>
                Meta&rsquo;s last answer: {d.last_error}
              </div>
            )}

            <table className="kv" style={{ marginTop: 12 }}>
              <tbody>
                <tr>
                  <th style={{ width: 190 }}>Dataset ID</th>
                  <td>
                    <code>{d.dataset_id}</code>{" "}
                    <span style={{ color: "var(--muted)" }}>({d.api_version})</span>
                  </td>
                </tr>
                <tr>
                  <th>Access token</th>
                  <td>
                    {d.has_token ? (
                      "Saved"
                    ) : (
                      <span style={{ color: "var(--err)" }}>Missing — nothing can be sent</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Sends for</th>
                  <td>
                    {d.form_id
                      ? campaigns.find((c) => c.id === d.form_id)?.name ?? "a removed campaign"
                      : "Every campaign"}
                    {" · "}
                    {d.site_id
                      ? sites.find((s) => s.id === d.site_id)?.name ?? "a removed website"
                      : "Every website"}
                  </td>
                </tr>
                <tr>
                  <th>Stages</th>
                  <td>
                    {d.stages.length === 0
                      ? "Every stage"
                      : d.stages
                          .map((k) => stages.find((s) => s.key === k)?.label ?? k)
                          .join(", ")}
                  </td>
                </tr>
                <tr>
                  <th>Last sent</th>
                  <td>{fmt(d.last_sent_at)}</td>
                </tr>
                <tr>
                  <th>Events</th>
                  <td>
                    <b>{d.counts.sent}</b> sent
                    {d.counts.pending > 0 && <> · {d.counts.pending} waiting</>}
                    {d.counts.failed > 0 && (
                      <>
                        {" · "}
                        <b style={{ color: "var(--err)" }}>{d.counts.failed} failed</b>
                      </>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      )}

      {adding ? (
        <DatasetForm
          campaigns={campaigns}
          sites={sites}
          stages={stages}
          defaultSource={defaultSource}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button className="btn" onClick={() => setAdding(true)} disabled={busy}>
          + Add a dataset
        </button>
      )}
    </>
  );
}

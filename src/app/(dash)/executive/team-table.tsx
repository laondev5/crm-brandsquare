"use client";

import { Fragment, useState } from "react";
import { ROLE_LABEL, type ExecPerson } from "@/lib/types";

type Key =
  | "name"
  | "today"
  | "days_signed_in"
  | "open_leads"
  | "new_leads"
  | "overdue_followups"
  | "won"
  | "actions"
  | "notes"
  | "wa_sent"
  | "tasks_done"
  | "tasks_overdue";

const COLS: { key: Key; label: string; title: string; num?: boolean }[] = [
  { key: "name", label: "Person", title: "Name and rank" },
  { key: "today", label: "Today", title: "When they signed in and out today" },
  { key: "days_signed_in", label: "Days in", title: "Days signed in during the period, and their usual start time", num: true },
  { key: "open_leads", label: "Open leads", title: "Leads they hold that are still in play", num: true },
  { key: "new_leads", label: "New", title: "Leads handed to them in the period", num: true },
  { key: "overdue_followups", label: "Late", title: "Their follow-ups that are past due", num: true },
  { key: "won", label: "Won", title: "Deals they moved to won in the period", num: true },
  { key: "actions", label: "Actions", title: "Everything they did on leads: stage moves, notes, assignments", num: true },
  { key: "notes", label: "Notes", title: "Notes written in the period", num: true },
  { key: "wa_sent", label: "WhatsApp", title: "WhatsApp messages they sent", num: true },
  { key: "tasks_done", label: "Tasks done", title: "Tasks completed in the period, and how many are open", num: true },
  { key: "tasks_overdue", label: "Overdue", title: "Their tasks past the due date", num: true },
];

function clock(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(d: string) {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Every person, one row each, sortable by whatever the question is today:
 * who won most, who is behind on follow-ups, who has not signed in. A row
 * opens in place to show their latest report, so comparing two people never
 * means going back and forth between their pages.
 */
export default function TeamTable({ team }: { team: ExecPerson[] }) {
  const [sort, setSort] = useState<Key>("actions");
  const [asc, setAsc] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const val = (p: ExecPerson, k: Key): number | string => {
    if (k === "name") return p.name.toLowerCase();
    if (k === "today") return p.today_in ?? "";
    return p[k];
  };
  const rows = [...team].sort((a, b) => {
    const x = val(a, sort);
    const y = val(b, sort);
    const r = x < y ? -1 : x > y ? 1 : 0;
    return asc ? r : -r;
  });

  const by = (k: Key) => {
    if (k === sort) setAsc(!asc);
    else {
      setSort(k);
      setAsc(k === "name");
    }
  };

  // Team totals along the bottom, so a person's number can be read against it.
  const total = (k: Exclude<Key, "name" | "today">) => team.reduce((n, p) => n + p[k], 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="tbl tbl-keep exec-team" style={{ minWidth: 1080 }}>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.key} title={c.title} style={{ textAlign: c.num ? "right" : "left" }}>
                <button type="button" className="exec-sort" onClick={() => by(c.key)} aria-sort={sort === c.key ? (asc ? "ascending" : "descending") : "none"}>
                  {c.label}
                  <span aria-hidden="true">{sort === c.key ? (asc ? " ▲" : " ▼") : ""}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const isOpen = open === p.user_id;
            const inAt = clock(p.today_in);
            const outAt = clock(p.today_out);
            const r = p.last_report;
            return (
              <Fragment key={p.user_id}>
                <tr className={`exec-team__row${isOpen ? " is-open" : ""}`} onClick={() => setOpen(isOpen ? null : p.user_id)}>
                  <td>
                    <span className="exec-team__caret" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                    <strong style={{ color: "var(--ink)" }}>{p.name}</strong>
                    <small style={{ display: "block", color: "var(--muted)", paddingLeft: 16 }}>{ROLE_LABEL[p.role] ?? p.role}</small>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {inAt ? (
                      <>
                        <span className="pill s-active">In {inAt}</span>
                        {outAt && <small style={{ display: "block", color: "var(--muted)" }}>Out {outAt}</small>}
                      </>
                    ) : (
                      <span className="pill" style={{ background: "#f1efe8" }}>Not in</span>
                    )}
                  </td>
                  <td className="num">
                    {p.days_signed_in}
                    {p.avg_sign_in && <small>usually {p.avg_sign_in}</small>}
                  </td>
                  <td className="num">{p.open_leads}</td>
                  <td className="num">{p.new_leads}</td>
                  <td className={`num${p.overdue_followups ? " is-bad" : ""}`}>{p.overdue_followups}</td>
                  <td className={`num${p.won ? " is-good" : ""}`}>{p.won}</td>
                  <td className="num">
                    {p.actions}
                    {p.stage_moves > 0 && <small>{p.stage_moves} stage moves</small>}
                  </td>
                  <td className="num">{p.notes}</td>
                  <td className="num">{p.wa_sent}</td>
                  <td className="num">
                    {p.tasks_done}
                    <small>{p.tasks_open} open</small>
                  </td>
                  <td className={`num${p.tasks_overdue ? " is-bad" : ""}`}>{p.tasks_overdue}</td>
                </tr>
                {isOpen && (
                  <tr className="exec-team__detail">
                    <td colSpan={COLS.length}>
                      {r ? (
                        <div className="exec-report">
                          <div className="exec-report__head">
                            Latest report · <strong>{dayLabel(r.work_date)}</strong>
                            {r.signed_in_at && ` · in ${clock(r.signed_in_at)}`}
                            {r.signed_out_at && ` · out ${clock(r.signed_out_at)}`}
                            {p.reports > 0 && ` · ${p.reports} report${p.reports === 1 ? "" : "s"} in this period`}
                          </div>
                          <dl>
                            <dt>Got done</dt>
                            <dd>{r.summary}</dd>
                            {r.blockers && (
                              <>
                                <dt>Blocked by</dt>
                                <dd className="is-bad">
                                  {r.blockers}
                                  {r.blocker_owner_name && (
                                    <small>
                                      {r.blocker_resolved_at ? ` ✓ cleared by ${r.blocker_owner_name}` : ` → waiting on ${r.blocker_owner_name}`}
                                    </small>
                                  )}
                                </dd>
                              </>
                            )}
                            {r.plan_tomorrow && (
                              <>
                                <dt>Next</dt>
                                <dd>{r.plan_tomorrow}</dd>
                              </>
                            )}
                          </dl>
                        </div>
                      ) : (
                        <p className="empty" style={{ margin: 0 }}>
                          {p.name} has not written a daily report yet.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>
              <strong>Team</strong>
            </td>
            <td className="num">{total("open_leads")}</td>
            <td className="num">{total("new_leads")}</td>
            <td className="num">{total("overdue_followups")}</td>
            <td className="num">{total("won")}</td>
            <td className="num">{total("actions")}</td>
            <td className="num">{total("notes")}</td>
            <td className="num">{total("wa_sent")}</td>
            <td className="num">{total("tasks_done")}</td>
            <td className="num">{total("tasks_overdue")}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

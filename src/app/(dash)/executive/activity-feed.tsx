"use client";

import { useState } from "react";
import type { ExecActivity } from "@/lib/types";

/** What each kind of change reads as, in a sentence. */
function describe(a: ExecActivity) {
  const lead = <strong>{a.lead_name || `lead #${a.lead_id}`}</strong>;
  switch (a.type) {
    case "status":
      return (
        <>
          moved {lead} {a.from_value ? <>from {a.from_value} </> : null}to <b>{a.to_value}</b>
        </>
      );
    case "assigned":
      return (
        <>
          gave {lead} to <b>{a.to_value || "nobody"}</b>
        </>
      );
    case "note":
      return <>added a note on {lead}</>;
    case "note_edited":
      return <>edited a note on {lead}</>;
    case "whatsapp":
      return <>messaged {lead} on WhatsApp</>;
    case "email":
      return <>emailed {lead}</>;
    case "created":
      return <>added {lead}</>;
    default:
      return (
        <>
          {a.type.replace(/_/g, " ")} on {lead}
          {a.to_value ? <>: {a.to_value}</> : null}
        </>
      );
  }
}

function when(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Every change made on a lead in the period, newest first, filterable by person. */
export default function ActivityFeed({ activity }: { activity: ExecActivity[] }) {
  const [who, setWho] = useState<number | "all">("all");
  const [kind, setKind] = useState("all");
  const people = [...new Map(activity.map((a) => [a.actor_id, a.actor_name])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1])
  );
  const shown = activity.filter((a) => (who === "all" || a.actor_id === who) && (kind === "all" || a.type === kind));

  if (activity.length === 0) return <p className="empty">No activity on leads in this period.</p>;

  return (
    <>
      <div className="exec-chips">
        <button type="button" className={who === "all" ? "on" : ""} onClick={() => setWho("all")}>
          Everyone <span>{activity.length}</span>
        </button>
        {people.map(([id, name]) => (
          <button key={id} type="button" className={who === id ? "on" : ""} onClick={() => setWho(id)}>
            {name.split(" ")[0]} <span>{activity.filter((a) => a.actor_id === id).length}</span>
          </button>
        ))}
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind of activity" style={{ width: "auto", fontSize: 12.5 }}>
          <option value="all">All kinds</option>
          <option value="status">Stage moves</option>
          <option value="note">Notes</option>
          <option value="assigned">Assignments</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
      <ul className="exec-activity">
        {shown.length === 0 && <li className="empty">Nothing matches.</li>}
        {shown.map((a) => (
          <li key={a.id} className={`t-${a.type}`}>
            <span className="exec-activity__who">{a.actor_name}</span> {describe(a)}
            <time>{when(a.created_at)}</time>
          </li>
        ))}
      </ul>
    </>
  );
}

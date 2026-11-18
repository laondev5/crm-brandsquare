"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { quickAddTaskAction } from "@/app/actions/tasks-global";
import { TASK_PRIORITIES, type DashUser } from "@/lib/types";

export interface RelatedOptions {
  orgs: { id: number; name: string }[];
  deals: { id: number; title: string }[];
  leads: { id: number; name: string; company: string }[];
}

/**
 * One line, one date, one person. The relation picker is what turns a task on
 * this screen into a task on the deal or company page as well — there is no
 * separate "add from record" flow to keep in step.
 */
export default function QuickAddTask({
  people,
  meId,
  related,
}: {
  people: DashUser[];
  meId: number;
  related: RelatedOptions;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(quickAddTaskAction, null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [detail, setDetail] = useState("");
  const [assignee, setAssignee] = useState(String(meId));
  const [priority, setPriority] = useState("normal");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!state?.ok) return;
    setTitle("");
    setDue("");
    setDetail("");
    setLink("");
    setPriority("normal");
    router.refresh();
  }, [state, router]);

  const linked = link.split(":");
  const leadId = linked[0] === "lead" ? linked[1] : "";
  const orgId = linked[0] === "org" ? linked[1] : "";
  const dealId = linked[0] === "deal" ? linked[1] : "";

  const hasRelated = related.orgs.length + related.deals.length + related.leads.length > 0;

  return (
    <form action={action} className="card" style={{ marginBottom: 14 }}>
      {state?.error && <div className="msg err">{state.error}</div>}

      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="deal_id" value={dealId} />

      <div className="row" style={{ gap: 8 }}>
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing? Call Namdi about the deposit…"
          aria-label="What needs doing"
          style={{ flex: 1, minWidth: 220 }}
        />
        <button className="btn" disabled={pending || !title.trim()}>
          {pending ? "Adding…" : "Add task"}
        </button>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <input
          type="datetime-local"
          name="due_at"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          style={{ width: 210 }}
          aria-label="When it is due"
        />
        <select
          name="assigned_to"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          style={{ width: 160 }}
          aria-label="Who it is for"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === meId ? "Me" : p.name}
            </option>
          ))}
        </select>
        <select
          name="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ width: 120 }}
          aria-label="Priority"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        {hasRelated && (
          <select
            value={link}
            onChange={(e) => setLink(e.target.value)}
            style={{ width: 220 }}
            aria-label="Related record"
          >
            <option value="">Not linked to a record</option>
            {related.deals.length > 0 && (
              <optgroup label="Deals">
                {related.deals.map((d) => (
                  <option key={`deal-${d.id}`} value={`deal:${d.id}`}>
                    {d.title}
                  </option>
                ))}
              </optgroup>
            )}
            {related.orgs.length > 0 && (
              <optgroup label="Organisations">
                {related.orgs.map((o) => (
                  <option key={`org-${o.id}`} value={`org:${o.id}`}>
                    {o.name}
                  </option>
                ))}
              </optgroup>
            )}
            {related.leads.length > 0 && (
              <optgroup label="Leads">
                {related.leads.map((l) => (
                  <option key={`lead-${l.id}`} value={`lead:${l.id}`}>
                    {l.name || "(no name)"}
                    {l.company ? ` — ${l.company}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
        <input
          type="text"
          name="detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Details (optional)"
          style={{ flex: 1, minWidth: 180 }}
          aria-label="Details"
        />
      </div>
    </form>
  );
}

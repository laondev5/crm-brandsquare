import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  listDeals,
  listLeads,
  listOrganizations,
  listTasks,
  listViews,
  teamPeople,
} from "@/lib/queries";
import { isAdminRole, TASK_SCOPES } from "@/lib/types";
import QuickAddTask from "./quick-add";
import TaskTable from "./table";
import ViewsBar from "../leads/views-bar";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    assignee?: string;
    q?: string;
    lead_id?: string;
    org_id?: string;
    deal_id?: string;
  }>;
}) {
  const sp = await searchParams;
  const me = await requireUser();
  const admin = isAdminRole(me.role);

  const scope = TASK_SCOPES.some((s) => s.key === sp.scope) ? (sp.scope as string) : "open";
  const assignee =
    sp.assignee === "me" || sp.assignee === "none"
      ? sp.assignee
      : Number(sp.assignee) || undefined;
  const term = (sp.q ?? "").trim();
  const leadId = Number(sp.lead_id) || undefined;
  const orgId = Number(sp.org_id) || undefined;
  const dealId = Number(sp.deal_id) || undefined;

  const [data, people, orgs, deals, leads, views] = await Promise.all([
    listTasks(me, {
      scope,
      assignee,
      q: term || undefined,
      lead_id: leadId,
      org_id: orgId,
      deal_id: dealId,
    }).catch(() => null),
    teamPeople().catch(() => []),
    listOrganizations(me).catch(() => null),
    listDeals(me, { sort: "recent" }).catch(() => null),
    listLeads({ page: 1, perPage: 200, ownerId: admin ? null : me.id }).catch(() => null),
    listViews("tasks").catch(() => []),
  ]);

  const filters = {
    scope,
    ...(sp.assignee ? { assignee: sp.assignee } : {}),
    ...(term ? { q: term } : {}),
    ...(leadId ? { lead_id: String(leadId) } : {}),
    ...(orgId ? { org_id: String(orgId) } : {}),
    ...(dealId ? { deal_id: String(dealId) } : {}),
  };
  const currentQuery = new URLSearchParams(filters).toString();

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ ...filters, ...over }).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const str = p.toString();
    return str ? `/tasks?${str}` : "/tasks";
  };

  const counts = data?.counts;
  const relation = dealId
    ? {
        label: deals?.deals.find((d) => d.id === dealId)?.title ?? `Deal #${dealId}`,
        href: `/deals/${dealId}`,
      }
    : orgId
      ? {
          label: orgs?.organizations.find((o) => o.id === orgId)?.name ?? `Organisation #${orgId}`,
          href: `/organizations/${orgId}`,
        }
      : leadId
        ? {
            label:
              leads?.rows.find((l) => l.id === leadId)?.name ||
              leads?.rows.find((l) => l.id === leadId)?.company ||
              `Lead #${leadId}`,
            href: `/leads/${leadId}`,
          }
        : null;

  const badge = (key: string) => {
    if (!counts) return "";
    if (key === "all") return String(counts.open + counts.done);
    return String(counts[key as keyof typeof counts] ?? 0);
  };

  return (
    <>
      <div className="head">
        <h1>Tasks</h1>
        <div className="spacer" />
        <span className="board-legend">
          {counts && counts.overdue > 0 && (
            <>
              <b style={{ color: "var(--err)" }}>{counts.overdue}</b> overdue{" · "}
            </>
          )}
          <b>{counts?.today ?? 0}</b> today{" · "}
          <b>{counts?.open ?? 0}</b> open
        </span>
      </div>

      <p className="board-hint">
        Everything the team has to do, whoever handed it out. A task added here appears on the deal,
        company or lead page it hangs off, and its date is the follow-up the agenda reads.
      </p>

      <QuickAddTask
        meId={me.id}
        people={people}
        related={{
          orgs: (orgs?.organizations ?? []).map((o) => ({ id: o.id, name: o.name })),
          deals: (deals?.deals ?? []).map((d) => ({ id: d.id, title: d.title })),
          leads: (leads?.rows ?? []).map((l) => ({ id: l.id, name: l.name, company: l.company })),
        }}
      />

      {relation && (
        <div className="msg ok">
          Showing tasks for{" "}
          <Link href={relation.href} style={{ fontWeight: 600 }}>
            {relation.label}
          </Link>
          . <Link href="/tasks">Show every record</Link>
        </div>
      )}

      <div className="row" style={{ gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {TASK_SCOPES.map((s) => (
            <Link key={s.key} href={href({ scope: s.key })} className={scope === s.key ? "on" : ""}>
              {s.label}
              {data && <span style={{ marginLeft: 6, opacity: 0.65 }}>{badge(s.key)}</span>}
            </Link>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <ViewsBar views={views} currentQuery={currentQuery} scope="tasks" basePath="/tasks" />
      </div>

      <form className="row" style={{ gap: 8, marginBottom: 14 }}>
        <input type="hidden" name="scope" value={scope} />
        {leadId && <input type="hidden" name="lead_id" value={leadId} />}
        {orgId && <input type="hidden" name="org_id" value={orgId} />}
        {dealId && <input type="hidden" name="deal_id" value={dealId} />}
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search a task, customer or deal"
          style={{ flex: 1, maxWidth: 340 }}
          aria-label="Search tasks"
        />
        <select name="assignee" defaultValue={sp.assignee ?? ""} style={{ width: "auto" }}>
          <option value="">Everyone</option>
          <option value="me">Assigned to me</option>
          <option value="none">Nobody</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="btn ghost sm">Filter</button>
      </form>

      {!data ? (
        <div className="msg err">Could not load tasks. The plugin needs to be version 1.39 or newer.</div>
      ) : (
        <TaskTable
          tasks={data.tasks}
          people={people}
          meId={me.id}
          isAdmin={admin}
          empty={
            term || relation
              ? "No task matches that."
              : scope === "done"
                ? "Nothing has been completed yet."
                : "Nothing outstanding. Add a task above and it shows up here."
          }
        />
      )}
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getMachineRequest, listPeopleNames } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import StatusControls from "../status-pills";
import RequestForm from "./form";
import RequestUpdates from "./updates";

function when(s: string | null) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime())
    ? s
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * One machine request: who it is for, what they asked for, where it has got
 * to, and everything that has happened to it.
 */
export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  const me = await requireMember();
  if (me.role === "author") redirect("/blog");

  const [data, people] = await Promise.all([
    getMachineRequest(me, id).catch(() => null),
    listPeopleNames().catch(() => []),
  ]);
  if (!data) notFound();

  const r = data.request;
  const canEdit = data.can_edit;

  return (
    <>
      <div className="head">
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {r.ref}
          <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)" }}>
            {r.machine || "Machine not stated"}
          </span>
        </h1>
        <div className="spacer" />
        {r.lead_id && (
          <Link href={`/leads/${r.lead_id}`} className="btn ghost">
            Linked lead
          </Link>
        )}
        <Link href="/requests" className="btn ghost">
          All requests
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <StatusControls r={r} canEdit={canEdit} />
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted)" }}>
          Logged by {r.created_by_name || "—"} on {when(r.request_date ?? r.created_at)} · last changed{" "}
          {when(r.updated_at)}
          {r.breakdown_link && (
            <>
              {" · "}
              <a href={r.breakdown_link} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                Open breakdown document
              </a>
            </>
          )}
        </p>
      </div>

      <div className="grid2">
        <div style={{ display: "grid", gap: 20 }}>
          <RequestForm r={r} people={people} canEdit={canEdit} canDelete={isAdminRole(me.role)} />
        </div>

        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          <RequestUpdates id={r.id} log={data.log} canEdit={canEdit} lastUpdate={r.last_update} nextAction={r.next_action} />
        </div>
      </div>
    </>
  );
}

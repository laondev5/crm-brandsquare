import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listTeam } from "@/lib/queries";
import NewSubadmin from "./new";
import TeamRow from "./row";

export default async function TeamPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/");

  const team = await listTeam();

  return (
    <>
      <div className="head">
        <h1>Team</h1>
      </div>

      <div className="grid2">
        <div className="card" style={{ padding: "6px 8px" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th style={{ width: 90 }}>Role</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 80 }}>Open</th>
                <th style={{ width: 100 }}>Last login</th>
                <th style={{ width: 240 }} />
              </tr>
            </thead>
            <tbody>
              {team.map((u) => (
                <TeamRow key={u.id} u={u} meId={me.id} />
              ))}
            </tbody>
          </table>
        </div>

        <NewSubadmin />
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16, maxWidth: 720 }}>
        <strong>Disable</strong> ends every one of their sessions immediately and stops new
        leads routing to them, but leaves their leads where they are — use it when someone is
        away. <strong>Delete</strong> removes the account and shares their leads evenly across
        the remaining active sub-admins, keeping each lead&rsquo;s status, notes and history
        intact. If nobody else is active, the leads go to Unassigned rather than disappearing.
      </p>
    </>
  );
}

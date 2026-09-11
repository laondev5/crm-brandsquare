import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/types";
import { currentUser } from "@/lib/auth";
import { listTeam } from "@/lib/queries";
import AddPanel from "./add-panel";
import TeamRow from "./row";

export default async function TeamPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!isAdminRole(me.role)) redirect("/");

  const team = await listTeam();
  // Only a super admin may change ranks or create anything above a sub-admin.
  const isSuper = me.role === "superadmin";

  return (
    <>
      <div className="head">
        <h1>Team</h1>
      </div>

      {/* Full width, and horizontally scrollable rather than crushed: seven
          columns plus a rank control and three buttons do not fit in half a
          page, and squeezing them is what made this stop reading as a table. */}
      <div className="card" style={{ padding: "6px 8px", overflowX: "auto", marginBottom: 18 }}>
        <table className="tbl" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Name</th>
              <th style={{ minWidth: 200 }}>Email</th>
              <th style={{ width: 140 }}>Rank</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 70 }}>Open</th>
              <th style={{ width: 110 }}>Last login</th>
              <th style={{ width: 250 }} />
            </tr>
          </thead>
          <tbody>
            {team.map((u) => (
              <TeamRow key={u.id} u={u} meId={me.id} isSuper={isSuper} />
            ))}
          </tbody>
        </table>
      </div>

      <AddPanel isSuper={isSuper} />

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

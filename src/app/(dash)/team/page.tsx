import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listTeam } from "@/lib/queries";
import { setStatusAction } from "../../actions/team";
import NewSubadmin from "./new";

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
                <th style={{ width: 110 }}>Last login</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.id}>
                  <td data-l="Name" style={{ color: "var(--ink)", fontWeight: 600 }}>{u.name || "—"}</td>
                  <td data-l="Email">{u.email}</td>
                  <td data-l="Role">{u.role === "admin" ? "Admin" : "Sub-admin"}</td>
                  <td data-l="Status">
                    <span className={`pill s-${u.status}`}>{cap(u.status)}</span>
                  </td>
                  <td data-l="Open">{Number(u.open_leads) || 0}</td>
                  <td data-l="Last login">{u.last_login_at ? fmt(u.last_login_at) : "Never"}</td>
                  <td data-l="">
                    {u.id !== me.id && u.role !== "admin" && (
                      <form action={setStatusAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={u.status === "disabled" ? "active" : "disabled"}
                        />
                        <button className={`btn ${u.status === "disabled" ? "ghost" : "danger"}`}
                                style={{ padding: "6px 12px", fontSize: 12 }}>
                          {u.status === "disabled" ? "Enable" : "Disable"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <NewSubadmin />
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16 }}>
        Disabling someone ends every one of their sessions immediately and stops new leads being
        assigned to them. Their existing leads stay put — reassign them from the lead page.
      </p>
    </>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

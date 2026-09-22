import { requireMember } from "@/lib/auth";
import { listAnnouncements, listPeopleNames } from "@/lib/queries";
import Composer from "./composer";
import RemoveAnnouncement from "./remove";

function when(s: string | null) {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime())
    ? s
    : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Announcements: what management tells the team. Everyone sees the ones meant
 * for them, newest first; management can post to everyone or to the people
 * tagged, now or scheduled. Opening this page counts as reading them.
 */
export default async function AnnouncementsPage() {
  const me = await requireMember();
  const [data, people] = await Promise.all([
    listAnnouncements(me).catch(() => null),
    listPeopleNames().catch(() => []),
  ]);

  return (
    <>
      <div className="head">
        <h1>Announcements</h1>
      </div>

      {!data && (
        <div className="msg err">Could not load announcements. The plugin needs to be version 1.29 or newer.</div>
      )}

      {data?.can_post && <Composer people={people} meId={me.id} />}

      {data?.can_post && data.scheduled.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Scheduled</h2>
          <ul className="notif-list">
            {data.scheduled.map((a) => (
              <li key={a.id} className="notif">
                <span className="notif__icon" aria-hidden="true">🕒</span>
                <div className="notif__main">
                  <strong style={{ color: "var(--ink)" }}>{a.title}</strong>
                  <div className="notif__time">
                    Goes out {when(a.publish_at)} · to {a.audience === "all" ? "everyone" : a.people.map((p) => p.name).join(", ")}
                    {a.send_email ? " · with email" : ""} · by {a.author_name}
                  </div>
                </div>
                {a.can_edit && <RemoveAnnouncement id={a.id} scheduled />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && data.published.length === 0 && (
        <div className="card">
          <p className="empty">No announcements yet.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {data?.published.map((a) => (
          <article key={a.id} id={`a${a.id}`} className="card ann">
            <header className="ann__head">
              <span className="ann__avatar" aria-hidden="true">
                {a.author_name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 className="ann__title">{a.title}</h2>
                <div className="notif__time">
                  {a.author_name} · {when(a.published_at)} ·{" "}
                  {a.audience === "all" ? <span className="ann__tag">@all</span> : a.people.map((p) => <span key={p.id} className="ann__tag">@{p.name}</span>)}
                </div>
              </div>
              {a.can_edit && <RemoveAnnouncement id={a.id} scheduled={false} />}
            </header>
            <p className="ann__body">{a.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}

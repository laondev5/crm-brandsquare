"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAnnouncementAction } from "@/app/actions/notifications";
import { ROLE_LABEL, type PersonName } from "@/lib/types";
import { usePulse } from "../pulse";

function inAnHour() {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

/**
 * Write an announcement, choose who hears it -- Everyone, or the people
 * tagged -- and post it now or at a set time. Everyone it reaches gets it in
 * their bell and as a pop-up; ticking "Also email" sends it to their inbox too.
 */
export default function Composer({ people, meId }: { people: PersonName[]; meId: number }) {
  const router = useRouter();
  const { refresh } = usePulse();
  const [state, action, pending] = useActionState(saveAnnouncementAction, null);
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<"all" | "people">("all");
  const [picked, setPicked] = useState<number[]>([]);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [q, setQ] = useState("");
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (state && "ok" in state) {
      router.refresh();
      refresh();
      setPicked([]);
      setAudience("all");
      setWhen("now");
      setRound((n) => n + 1);
    }
  }, [state, router, refresh]);

  const others = people.filter((p) => p.id !== meId);
  const shown = others.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: number) => setPicked((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));

  if (!open) {
    return (
      <div style={{ marginBottom: 18 }}>
        {state && "ok" in state && <div className="msg ok">{state.ok}</div>}
        <button className="btn" onClick={() => setOpen(true)}>
          + New announcement
        </button>
      </div>
    );
  }

  return (
    <form key={round} action={action} className="card ann-form" style={{ marginBottom: 20, maxWidth: 780 }}>
      <h2>New announcement</h2>
      {state && "error" in state && <div className="msg err">{state.error}</div>}
      {state && "ok" in state && <div className="msg ok">{state.ok}</div>}

      <label className="f">
        <span>Title</span>
        <input type="text" name="title" required placeholder="Office closed on Friday" />
      </label>
      <label className="f">
        <span>Message</span>
        <textarea name="body" rows={5} required placeholder="Write what everyone needs to know…" />
      </label>

      <div className="f">
        <span>Who is it for?</span>
        <div className="seg">
          <label className={audience === "all" ? "on" : ""}>
            <input type="radio" name="audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} />
            <b>@all</b> Everyone on the CRM
          </label>
          <label className={audience === "people" ? "on" : ""}>
            <input type="radio" name="audience" value="people" checked={audience === "people"} onChange={() => setAudience("people")} />
            Tag people
          </label>
        </div>
        {audience === "people" && (
          <div className="mtg-people" style={{ marginTop: 8 }}>
            <div className="mtg-people__bar">
              <input type="search" placeholder="Search the team…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the team" />
              {picked.length > 0 && (
                <button type="button" className="btn ghost sm" onClick={() => setPicked([])}>
                  Clear
                </button>
              )}
              <span className="board-legend" style={{ alignSelf: "center" }}>
                {picked.length} tagged
              </span>
            </div>
            <div className="mtg-people__list">
              {shown.map((p) => (
                <label key={p.id} className={`mtg-person${picked.includes(p.id) ? " is-on" : ""}`}>
                  <input type="checkbox" name="people" value={p.id} checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
                  <span className="mtg-person__avatar" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase()}</span>
                  <span>
                    <b>{p.name}</b>
                    <small>{ROLE_LABEL[p.role] ?? p.role}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="f">
        <span>When should it go out?</span>
        <div className="seg">
          <label className={when === "now" ? "on" : ""}>
            <input type="radio" name="when" value="now" checked={when === "now"} onChange={() => setWhen("now")} />
            Post now
          </label>
          <label className={when === "later" ? "on" : ""}>
            <input type="radio" name="when" value="later" checked={when === "later"} onChange={() => setWhen("later")} />
            Schedule
          </label>
        </div>
        {when === "later" && (
          <input type="datetime-local" name="publish_at" defaultValue={inAnHour()} required style={{ marginTop: 8, maxWidth: 260 }} />
        )}
      </div>

      <label className="row" style={{ gap: 8, alignItems: "center", margin: "4px 0 14px", fontSize: 13.5 }}>
        <input type="checkbox" name="send_email" value="1" defaultChecked style={{ width: "auto" }} />
        Also email it to them
      </label>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : when === "now" ? "Post announcement" : "Schedule announcement"}
        </button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </form>
  );
}

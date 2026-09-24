"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRequestAction } from "@/app/actions/requests";
import type { MachineRequest, MachineSource } from "@/lib/types";

/**
 * Machine requests raised for this lead.
 *
 * The lead already knows who the customer is, so the form here asks only what
 * they want: phone, name and company come across by themselves. It is the
 * same record procurement works from the Machine requests page.
 */
export default function LeadMachineRequests({
  leadId,
  lead,
  requests,
  sources,
  canAdd,
}: {
  leadId: number;
  lead: { name: string; email: string; phone: string; company: string };
  requests: MachineRequest[];
  sources: MachineSource[];
  canAdd: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createRequestAction, null);
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (state && "ok" in state) {
      router.refresh();
      setOpen(false);
      setRound((n) => n + 1);
    }
  }, [state, router]);

  const pickable = sources.filter((s) => !s.archived);
  const noPhone = !lead.phone?.trim();

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Machine requests</h2>
        {requests.length > 0 && <span className="pill s-active">{requests.length}</span>}
        <div style={{ flex: 1 }} />
        {canAdd && !open && (
          <button className="btn ghost sm" onClick={() => setOpen(true)}>
            + New request
          </button>
        )}
      </div>

      {state && "ok" in state && (
        <div className="msg ok">
          Request saved.{" "}
          {state.id && (
            <Link href={`/requests/${state.id}`} style={{ fontWeight: 600 }}>
              Open it
            </Link>
          )}
        </div>
      )}

      {requests.length === 0 && !open && (
        <p className="empty" style={{ padding: "10px 0", margin: 0 }}>
          None yet. Raise one when they ask about a machine, and procurement picks it up from there.
        </p>
      )}

      {requests.length > 0 && (
        <ul className="notif-list" style={{ marginBottom: open ? 14 : 0 }}>
          {requests.map((r) => (
            <li key={r.id} className="notif">
              <span className="notif__icon" aria-hidden="true">⚙</span>
              <div className="notif__main">
                <Link href={`/requests/${r.id}`} className="notif__title" style={{ display: "block" }}>
                  {r.ref} · {r.machine || "Machine not stated"}
                </Link>
                <div className="notif__body">
                  {r.status_label} · Breakdown: {r.breakdown_label}
                  {r.capacity ? ` · ${r.capacity}` : ""}
                </div>
                {r.last_update && <div className="notif__time">{r.last_update}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form key={round} action={action} className="mr-form" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          {state && "error" in state && <div className="msg err">{state.error}</div>}
          {/* The customer is already known: these ride along rather than being retyped. */}
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="name" value={lead.name ?? ""} />
          <input type="hidden" name="company" value={lead.company ?? ""} />
          <input type="hidden" name="email" value={lead.email ?? ""} />

          <label className="f">
            <span>
              Phone <b style={{ color: "var(--p)" }}>*</b>
            </span>
            <input
              type="text"
              name="phone"
              required
              defaultValue={lead.phone ?? ""}
              placeholder="+234 801 234 5678"
            />
            {noPhone && (
              <small style={{ color: "#8a5a00", fontSize: 12 }}>
                This lead has no phone number saved — type the one they contacted you on.
              </small>
            )}
          </label>

          <div className="mr-form__row">
            <label className="f">
              <span>Machine requested</span>
              <input type="text" name="machine" placeholder="Rice milling machine" autoFocus={!noPhone} />
            </label>
            <label className="f">
              <span>Capacity</span>
              <input type="text" name="capacity" placeholder="2 TPH" />
            </label>
          </div>

          <label className="f">
            <span>Requirements and details</span>
            <textarea name="requirements" rows={3} placeholder="What they said they need, in their own words." />
          </label>

          <label className="f">
            <span>Where did it come from?</span>
            <select name="source" defaultValue={pickable[0]?.key ?? "whatsapp"}>
              {pickable.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="row" style={{ gap: 10 }}>
            <button className="btn" disabled={pending}>
              {pending ? "Saving…" : "Save request"}
            </button>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

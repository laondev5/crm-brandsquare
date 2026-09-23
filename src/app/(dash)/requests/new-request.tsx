"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRequestAction } from "@/app/actions/requests";
import { MR_SOURCES, ROLE_LABEL, type PersonName } from "@/lib/types";

/**
 * Logging an enquiry the moment it arrives.
 *
 * Phone first and phone only: everything else can be filled in later from the
 * request itself, and asking for a name up front is what keeps enquiries
 * sitting in WhatsApp instead of in the CRM.
 */
export default function NewRequest({ people, openAtStart = false }: { people: PersonName[]; openAtStart?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createRequestAction, null);
  const [open, setOpen] = useState(openAtStart);
  const [more, setMore] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (state && "ok" in state) {
      router.refresh();
      setRound((n) => n + 1);
      setMore(false);
    }
  }, [state, router]);

  if (!open) {
    return (
      <div style={{ marginBottom: 16 }}>
        {state && "ok" in state && (
          <div className="msg ok">
            Request saved.{" "}
            {state.id && (
              <a href={`/requests/${state.id}`} style={{ fontWeight: 600 }}>
                Open it
              </a>
            )}
          </div>
        )}
        <button className="btn" onClick={() => setOpen(true)}>
          + New machine request
        </button>
      </div>
    );
  }

  return (
    <form key={round} action={action} className="card mr-form" style={{ marginBottom: 20 }}>
      <h2>New machine request</h2>
      {state && "error" in state && <div className="msg err">{state.error}</div>}
      {state && "ok" in state && (
        <div className="msg ok">
          Request saved.{" "}
          {state.id && (
            <a href={`/requests/${state.id}`} style={{ fontWeight: 600 }}>
              Open it
            </a>
          )}{" "}
          The form is ready for the next one.
        </div>
      )}

      <div className="mr-form__row">
        <label className="f">
          <span>
            Phone number <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input type="text" name="phone" required autoFocus placeholder="+234 801 234 5678" />
        </label>
        <label className="f">
          <span>Where did it come from?</span>
          <select name="source" defaultValue="whatsapp">
            {MR_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mr-form__row">
        <label className="f">
          <span>Machine requested</span>
          <input type="text" name="machine" placeholder="Rice milling machine" />
        </label>
        <label className="f">
          <span>Capacity</span>
          <input type="text" name="capacity" placeholder="2 TPH" />
        </label>
      </div>

      <label className="f">
        <span>Requirements and details</span>
        <textarea name="requirements" rows={2} placeholder="What they said they need, in their own words." />
      </label>

      <p className="mr-hint">
        Name, company and email can be left empty. Fill them in later, when the customer gives them.
      </p>

      {!more ? (
        <button type="button" className="btn ghost sm" onClick={() => setMore(true)} style={{ marginBottom: 14 }}>
          Add customer details and assignment
        </button>
      ) : (
        <>
          <div className="mr-form__row">
            <label className="f">
              <span>Customer name</span>
              <input type="text" name="name" placeholder="Not provided" />
            </label>
            <label className="f">
              <span>Company</span>
              <input type="text" name="company" placeholder="Not provided" />
            </label>
          </div>
          <div className="mr-form__row">
            <label className="f">
              <span>Email</span>
              <input type="email" name="email" placeholder="Not provided" />
            </label>
            <label className="f">
              <span>Location / country</span>
              <input type="text" name="country" placeholder="Lagos, Nigeria" />
            </label>
          </div>
          <div className="mr-form__row">
            <label className="f">
              <span>Assign procurement</span>
              <select name="assigned_procurement" defaultValue="">
                <option value="">Nobody yet</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {ROLE_LABEL[p.role] ?? p.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="f">
              <span>Assign sales</span>
              <select name="assigned_sales" defaultValue="">
                <option value="">Nobody yet</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {ROLE_LABEL[p.role] ?? p.role}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="f">
            <span>Next action</span>
            <input type="text" name="next_action" placeholder="Contact manufacturer for pricing" />
          </label>
        </>
      )}

      <div className="row" style={{ gap: 10 }}>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save request"}
        </button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </form>
  );
}

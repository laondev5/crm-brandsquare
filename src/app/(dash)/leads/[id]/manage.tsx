"use client";

import { useActionState, useState } from "react";
import { updateLeadAction } from "@/app/actions/leads";
import type { FormState } from "@/app/actions/auth";
import type { DashUser, LeadRow, Pipeline } from "@/lib/types";

/**
 * The Manage panel.
 *
 * Two things were wrong with the plain server-action form this replaces.
 *
 * It reported nothing. getLeadFull swallows its errors and returns null, so a
 * dropped connection made Save do absolutely nothing — no change, no message,
 * no way to tell it had failed.
 *
 * And the stage dropdown was uncontrolled. After a save the page re-rendered
 * from the server, React left the already-mounted <select> alone, and it
 * showed the stage the lead used to be in while the pill above showed the new
 * one. The save had worked; the control said otherwise. Holding the value in
 * state and re-syncing it when the saved lead comes back is what keeps the two
 * telling the same story.
 */
export default function Manage({
  lead,
  subs,
  isAdmin,
  pipeline,
}: {
  lead: LeadRow;
  subs: DashUser[];
  isAdmin: boolean;
  pipeline: Pipeline;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateLeadAction, {});
  return (
    <form className="card" action={action}>
      <h2>Manage</h2>
      <input type="hidden" name="id" value={lead.id} />

      {state.error && <div className="msg err">{state.error}</div>}
      {state.ok && <div className="msg ok">{state.ok}</div>}

      {/* Keyed on the stored stage, so a save that changes it remounts this
          whole block and every control inside re-reads the saved value. The
          alternatives both failed: a controlled select re-synced by an effect
          lost the race between the action's re-render and the refreshed props,
          and an uncontrolled one was simply left alone by React — either way
          the dropdown kept showing the stage the lead had just left while the
          pill above showed the new one, which reads as "the save didn't work".
          The note field sits outside so it is not cleared by the remount. */}
      <StageFields
        key={`${lead.status}:${lead.lost_reason}`}
        lead={lead}
        pipeline={pipeline}
      />

      {isAdmin && (
        <label className="f">
          <span>Assigned to</span>
          <select key={lead.assigned_to ?? 0} name="assigned_to" defaultValue={lead.assigned_to ?? 0}>
            <option value={0}>Unassigned</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.email}
                {s.status !== "active" ? ` (${s.status})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="f">
        <span>Next action due</span>
        <input
          type="datetime-local"
          name="next_action_at"
          defaultValue={
            lead.next_action_at ? lead.next_action_at.replace(" ", "T").slice(0, 16) : ""
          }
        />
      </label>

      <label className="f">
        <span>Add a note</span>
        <textarea name="note" placeholder="What happened on this lead?" />
      </label>

      <button
        className="btn"
        disabled={pending}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

/**
 * The stage dropdown and the reason field that belongs with it. Split out so
 * the parent can remount just this pair when the saved stage changes, without
 * clearing the note someone may still be typing.
 */
function StageFields({ lead, pipeline }: { lead: LeadRow; pipeline: Pipeline }) {
  // Uncontrolled, so typing and picking behave exactly as the browser intends
  // and the form submits the DOM value. The parent's key is what makes it
  // honest after a save: React never rewrites an uncontrolled control's value
  // on re-render — it deliberately preserves what the user did — so the only
  // reliable way to show a newly saved stage is to mount a fresh node.
  const [status, setStatus] = useState(lead.status);

  return (
    <>
      <label className="f">
        <span>Stage</span>
        <select
          name="status"
          defaultValue={lead.status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {pipeline.stages.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {/* Appears the moment Lost is picked, on the same save — a reason asked
          for on a later visit never gets filled in. */}
      {status === pipeline.lost_key && (
        <label className="f">
          <span>Why was it lost?</span>
          <input
            type="text"
            name="lost_reason"
            defaultValue={lead.lost_reason}
            maxLength={255}
            placeholder="Price, lead time, went with a competitor…"
          />
        </label>
      )}
    </>
  );
}

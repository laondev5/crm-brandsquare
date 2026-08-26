"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addLeadAction, type AddLeadState } from "../../../actions/leads";
import { LEAD_STATUSES } from "@/lib/types";
import type { Campaign, DashUser } from "@/lib/types";

interface Props {
  campaigns: Campaign[];
  subs: DashUser[];
  isAdmin: boolean;
}

/**
 * "Add another" used to be a link back to /leads/new. Navigating to the route
 * you are already on does not unmount anything, so the action state kept
 * leadCreated: true and the success screen simply stayed on screen — the
 * button looked dead. Bumping this key remounts the form instead, which
 * resets the action state and every field along with it.
 */
export default function AddLeadForm(props: Props) {
  const [instance, setInstance] = useState(0);
  return (
    <AddLeadFormInner
      key={instance}
      {...props}
      onAddAnother={() => setInstance((n) => n + 1)}
    />
  );
}

function AddLeadFormInner({
  campaigns,
  subs,
  isAdmin,
  onAddAnother,
}: Props & { onAddAnother: () => void }) {
  const [state, action, pending] = useActionState<AddLeadState, FormData>(addLeadAction, {});
  const [campaignChoice, setCampaignChoice] = useState<"none" | "existing" | "new">("none");
  const [fields, setFields] = useState<{ label: string; value: string }[]>([
    { label: "", value: "" },
  ]);

  if (state.leadCreated) {
    return (
      <>
        <div className="head">
          <h1>Lead added</h1>
        </div>
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="msg ok">{state.ok}</div>
          <div className="row">
            <button type="button" className="btn" onClick={onAddAnother}>
              Add another
            </button>
            <Link href="/leads" className="btn ghost">
              Go to leads
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <form action={action}>
      <div className="head">
        <h1>Add a lead</h1>
        <div className="spacer" />
        <Link href="/leads" className="btn ghost">
          Cancel
        </Link>
      </div>

      {state.error && <div className="msg err">{state.error}</div>}

      <div className="grid2">
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <h2>Contact details</h2>
            <div className="two">
              <label className="f">
                <span>Full name</span>
                <input type="text" name="name" placeholder="Chinedu Okafor" />
              </label>
              <label className="f">
                <span>Phone</span>
                <input type="tel" name="phone" placeholder="0803 123 4567" />
              </label>
            </div>
            <label className="f">
              <span>Email</span>
              <input type="email" name="email" placeholder="chinedu@ridgemills.ng" />
            </label>
            <small style={{ color: "var(--muted)", fontSize: 12 }}>
              At least one of name, email or phone is required.
            </small>
          </div>

          <div className="card">
            <h2>Additional details</h2>
            <p style={{ marginTop: 0, fontSize: 13, color: "var(--muted)" }}>
              Anything else you know about them — budget mentioned, machine wanted, how they
              found you.
            </p>
            {fields.map((f, i) => (
              <div key={i} className="row" style={{ marginBottom: 8, alignItems: "flex-start" }}>
                <input
                  type="text"
                  name="field_label"
                  placeholder="Field name, e.g. Machine wanted"
                  defaultValue={f.label}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  name="field_value"
                  placeholder="Value"
                  defaultValue={f.value}
                  style={{ flex: 1 }}
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setFields(fields.filter((_, x) => x !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setFields([...fields, { label: "", value: "" }])}
            >
              + Add field
            </button>
          </div>

          <div className="card">
            <h2>Note (optional)</h2>
            <textarea name="note" rows={3} placeholder="Any context worth keeping on file" />
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <h2>Campaign</h2>
            <label className="chooser">
              <input
                type="radio"
                checked={campaignChoice === "none"}
                onChange={() => setCampaignChoice("none")}
              />
              <span>
                <strong>No campaign</strong>
                <small>Just a lead, not tied to a source</small>
              </span>
            </label>
            <label className="chooser">
              <input
                type="radio"
                checked={campaignChoice === "existing"}
                onChange={() => setCampaignChoice("existing")}
              />
              <span>
                <strong>Existing campaign</strong>
              </span>
            </label>
            {campaignChoice === "existing" && (
              <select name="campaign_id" style={{ marginBottom: 8 }}>
                <option value="">Choose…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <label className="chooser">
              <input
                type="radio"
                checked={campaignChoice === "new"}
                onChange={() => setCampaignChoice("new")}
              />
              <span>
                <strong>New source</strong>
                <small>e.g. &ldquo;Trade show, Lagos 2026&rdquo;</small>
              </span>
            </label>
            {campaignChoice === "new" && (
              <input type="text" name="campaign_name" placeholder="Name this source" />
            )}
          </div>

          <div className="card">
            <h2>Stage &amp; owner</h2>
            <label className="f">
              <span>Stage</span>
              <select name="status" defaultValue="new">
                {LEAD_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            {isAdmin ? (
              <label className="f">
                <span>Assign to</span>
                <select name="assigned_to" defaultValue="">
                  <option value="">Auto-assign</option>
                  <option value="unassigned">Leave unassigned</option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                This will be assigned to you.
              </p>
            )}
          </div>

          <button className="btn" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
            {pending ? "Saving…" : "Add lead"}
          </button>
        </div>
      </div>
    </form>
  );
}

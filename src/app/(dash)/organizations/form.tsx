"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveOrganizationAction, type OrganizationFormState } from "@/app/actions/organizations";
import { ORG_STATUSES, ORG_TYPES, type DashUser, type Organization, type OrgType } from "@/lib/types";

export default function OrganizationForm({
  organization = null,
  owners = [],
  canAssignOwner = false,
}: {
  organization?: Organization | null;
  owners?: DashUser[];
  canAssignOwner?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OrganizationFormState, FormData>(saveOrganizationAction, null);
  // "Other" is the only kind that needs words of its own, so the box that asks
  // for them only exists while it is chosen.
  const [kind, setKind] = useState<OrgType>(organization?.org_type ?? "partner");

  useEffect(() => {
    if (!state?.ok || !state.organization) return;
    if (!organization) router.replace(`/organizations/${state.organization.id}`);
    else router.refresh();
  }, [state, organization, router]);

  return (
    <form action={action} className="card qt-form">
      <input type="hidden" name="id" value={organization?.id ?? ""} />

      {state?.error && <div className="msg err">{state.error}</div>}
      {state?.ok && <div className="msg ok">Saved.</div>}

      <h2>{organization ? "Company details" : "Create company"}</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Maintain company information, contact details and ownership for related sales and documents.
      </p>

      <div className="qt-grid">
        <label className="f">
          <span>
            Name <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input type="text" name="name" required defaultValue={organization?.name ?? ""} placeholder="Namdi Agro Ltd" />
        </label>
        <label className="f">
          <span>Kind</span>
          <select name="org_type" value={kind} onChange={(e) => setKind(e.target.value as OrgType)}>
            {ORG_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {kind === "other" && (
          <label className="f">
            <span>Kind of partnership</span>
            <input
              type="text"
              name="org_type_other"
              required
              maxLength={60}
              defaultValue={organization?.org_type_other ?? ""}
              placeholder="Logistics partner, franchisee, distributor…"
            />
          </label>
        )}
        <label className="f">
          <span>Status</span>
          <select name="status" defaultValue={organization?.status ?? "prospect"}>
            {ORG_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Sector</span>
          <input type="text" name="sector" defaultValue={organization?.sector ?? ""} placeholder="Agro-processing" />
        </label>
        <label className="f">
          <span>Website</span>
          <input type="text" name="website" defaultValue={organization?.website ?? ""} placeholder="namdiagro.com" />
        </label>
        <label className="f">
          <span>Country</span>
          <input type="text" name="country" defaultValue={organization?.country ?? ""} placeholder="Nigeria" />
        </label>
        <label className="f">
          <span>Location</span>
          <input type="text" name="location" defaultValue={organization?.location ?? ""} placeholder="Port Harcourt, Rivers" />
        </label>
        <label className="f">
          <span>Company source</span>
          <input type="text" name="source" defaultValue={organization?.source ?? ""} placeholder="Referral, exhibition, website" />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>Primary contact</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Contact name</span>
          <input type="text" name="contact_name" defaultValue={organization?.contact_name ?? ""} placeholder="Peter Namdi" />
        </label>
        <label className="f">
          <span>Phone</span>
          <input type="text" name="contact_phone" defaultValue={organization?.contact_phone ?? ""} placeholder="+234 801 234 5678" />
        </label>
        <label className="f">
          <span>Email</span>
          <input type="text" name="contact_email" defaultValue={organization?.contact_email ?? ""} placeholder="name@company.com" />
        </label>
        {canAssignOwner && (
          <label className="f">
            <span>Owner</span>
            <select name="assigned_to" defaultValue={organization?.assigned_to ?? ""}>
              <option value="">Unassigned</option>
              {owners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="f" style={{ marginTop: 8 }}>
        <span>Notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={organization?.notes ?? ""}
          placeholder="What they buy, volumes, who signs off, anything the next person should know."
        />
      </label>

      <div className="row" style={{ gap: 10, marginTop: 8 }}>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : organization ? "Save changes" : "Create company"}
        </button>
        {organization && (
          <small style={{ color: "var(--muted)" }}>
            An organisation cannot be deleted while its documents still point at it.
          </small>
        )}
      </div>
    </form>
  );
}

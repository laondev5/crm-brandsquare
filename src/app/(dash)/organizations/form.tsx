"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOrganizationAction, type OrganizationFormState } from "@/app/actions/organizations";
import { ORG_STATUSES, ORG_TYPES, type DashUser, type Organization } from "@/lib/types";

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

      <h2>{organization ? "The organisation" : "Add an organisation"}</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
        A partner or bulk buyer that outlives any one enquiry. Quotations, invoices and receipts are
        made out to this record, and everyone can find the history in one place.
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
          <select name="org_type" defaultValue={organization?.org_type ?? "partner"}>
            {ORG_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
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
          <span>How they came to us</span>
          <input type="text" name="source" defaultValue={organization?.source ?? ""} placeholder="Referral, exhibition, website" />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>The person we deal with</h2>
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
              <option value="">Nobody yet</option>
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
          {pending ? "Saving…" : organization ? "Save changes" : "Add organisation"}
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

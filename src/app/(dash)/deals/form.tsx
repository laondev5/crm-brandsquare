"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDealAction, type DealFormState } from "@/app/actions/deals";
import { money, type DashUser, type Deal, type Stage } from "@/lib/types";

export interface DealOption {
  id: number;
  name: string;
  hint?: string;
}

export default function DealForm({
  deal = null,
  stages,
  organizations = [],
  leads = [],
  owners = [],
  canAssignOwner = false,
  defaultCurrency = "NGN",
  defaultOrgId = null,
  defaultLeadId = null,
}: {
  deal?: Deal | null;
  stages: Stage[];
  organizations?: DealOption[];
  leads?: DealOption[];
  owners?: DashUser[];
  canAssignOwner?: boolean;
  defaultCurrency?: string;
  /** Set when the form was opened from an organisation or lead page. */
  defaultOrgId?: number | null;
  defaultLeadId?: number | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DealFormState, FormData>(saveDealAction, null);
  const firstOpen = stages.find((s) => s.type === "open") ?? stages[0];
  const [stage, setStage] = useState(deal?.stage ?? firstOpen?.key ?? "new");
  const stageType = stages.find((s) => s.key === stage)?.type;

  useEffect(() => {
    if (!state?.ok || !state.deal) return;
    if (!deal) router.replace(`/deals/${state.deal.id}`);
    else router.refresh();
  }, [state, deal, router]);

  return (
    <form action={action} className="card qt-form">
      <input type="hidden" name="id" value={deal?.id ?? ""} />

      {state?.error && <div className="msg err">{state.error}</div>}
      {state?.ok && <div className="msg ok">Deal saved.</div>}

      <h2>Deal details</h2>

      <div className="qt-grid">
        <label className="f" style={{ gridColumn: "1 / -1" }}>
          <span>
            Deal name <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input
            type="text"
            name="title"
            required
            defaultValue={deal?.title ?? ""}
            placeholder="50 tonnes of rice milling line — Namdi Agro"
          />
        </label>
        <label className="f">
          <span>Amount</span>
          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            defaultValue={deal?.amount ?? 0}
            placeholder="0.00"
          />
        </label>
        <label className="f">
          <span>Currency</span>
          <input
            type="text"
            name="currency"
            maxLength={8}
            defaultValue={deal?.currency ?? defaultCurrency}
            placeholder="NGN"
          />
        </label>
        <label className="f">
          <span>Deal stage</span>
          <select
            name="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            {stages.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} ({s.probability}%)
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Expected close date</span>
          <input type="date" name="close_date" defaultValue={deal?.close_date?.slice(0, 10) ?? ""} />
        </label>
        <label className="f">
          <span>Associated company</span>
          <select name="org_id" defaultValue={deal?.org_id ?? defaultOrgId ?? ""}>
            <option value="">No associated company</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Associated lead</span>
          <select name="lead_id" defaultValue={deal?.lead_id ?? defaultLeadId ?? ""}>
            <option value="">No associated lead</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name || "(no name)"}
                {l.hint ? ` — ${l.hint}` : ""}
              </option>
            ))}
          </select>
        </label>
        {canAssignOwner && (
          <label className="f">
            <span>Deal owner</span>
            <select name="owner_id" defaultValue={deal?.owner_id ?? ""}>
              <option value="">Unassigned</option>
              {owners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="f">
          <span>Deal source</span>
          <input
            type="text"
            name="source"
            defaultValue={deal?.source ?? ""}
            placeholder="Referral, exhibition, repeat order"
          />
        </label>
        {stageType === "lost" && (
          <label className="f" style={{ gridColumn: "1 / -1" }}>
            <span>Closed lost reason</span>
            <input
              type="text"
              name="lost_reason"
              defaultValue={deal?.lost_reason ?? ""}
              placeholder="Price, timing or competitor"
            />
          </label>
        )}
      </div>

      <label className="f" style={{ marginTop: 8 }}>
        <span>Description</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={deal?.notes ?? ""}
          placeholder="Requirements, decision-makers and next steps"
        />
      </label>

      <div className="row" style={{ gap: 10, marginTop: 8 }}>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : deal ? "Save changes" : "Add deal"}
        </button>
        {deal && (
          <small style={{ color: "var(--muted)" }}>
            {deal.stage_label} · {money(deal.amount, deal.currency)} · {deal.probability}% probability
          </small>
        )}
      </div>
    </form>
  );
}

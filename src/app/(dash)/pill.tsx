import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

export default function StatusPill({ status }: { status: LeadStatus | string }) {
  const label = LEAD_STATUSES.find((s) => s.key === status)?.label ?? status;
  return <span className={`pill s-${status}`}>{label}</span>;
}

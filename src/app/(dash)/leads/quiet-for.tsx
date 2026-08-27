/**
 * How long a lead has been silent, as an amber badge.
 *
 * Deliberately says the number of days rather than just "Stale": three days
 * past the threshold and three months past it are very different problems, and
 * the difference is what tells you which one to call first.
 */
export default function QuietFor({ days }: { days: number | null }) {
  if (days === null) return null;

  const label =
    days >= 60
      ? `Quiet ${Math.floor(days / 30)} months`
      : days >= 14
        ? `Quiet ${Math.floor(days / 7)} weeks`
        : `Quiet ${days} days`;

  return (
    <span
      className="pill p-stale"
      title={`No calls, notes, emails or stage changes for ${days} days`}
    >
      {label}
    </span>
  );
}

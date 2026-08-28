import type { LeadStatus, Pipeline } from "@/lib/types";
import { stageOf } from "@/lib/types";

/**
 * A stage pill. Takes the colour from the stage definition rather than a CSS
 * class per stage, because the stages are configurable now — a hard-coded
 * `.s-qualified` rule would silently render nothing the first time someone
 * adds a stage in WordPress.
 *
 * The tint is mixed from the same colour so the pair can never drift apart.
 */
export default function StatusPill({
  status,
  pipeline,
}: {
  status: LeadStatus;
  pipeline?: Pipeline;
}) {
  const stage = pipeline ? stageOf(pipeline, status) : undefined;

  if (!stage) {
    // Team status ("active", "invited") and anything unrecognised keep the
    // legacy classes, which still exist for exactly these.
    return <span className={`pill s-${status}`}>{status}</span>;
  }

  return (
    <span
      className="pill is-stage"
      style={{ ["--stage" as string]: stage.colour }}
      title={`${stage.probability}% likely to close from here`}
    >
      {stage.label}
    </span>
  );
}

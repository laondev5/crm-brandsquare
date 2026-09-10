import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getPipeline, listCampaigns } from "@/lib/queries";
import StageEditor from "./editor";

/**
 * Pipeline settings.
 *
 * There is one shared pipeline, and any campaign may take a copy and diverge.
 * That split is the whole design: a machinery enquiry and a spare-parts
 * enquiry do not move through the same steps, but most campaigns never need
 * their own and should not have to maintain one.
 */
export default async function StageSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>;
}) {
  // Changing the pipeline changes what every screen shows and what stage a
  // sub-admin can move a lead into, so it is an admin's decision.
  await requireAdmin();

  const sp = await searchParams;
  const formId = Number(sp.form) || null;

  const [pipeline, campaigns] = await Promise.all([
    getPipeline(formId),
    listCampaigns(1, 100)
      .then((r) => r.rows)
      .catch(() => []),
  ]);

  const active = campaigns.find((c) => c.id === formId);

  // A campaign that was asked for but does not exist would otherwise silently
  // edit the shared pipeline, which is the opposite of what was intended.
  if (formId && !active) {
    return (
      <>
        <div className="head">
          <h1>Pipeline stages</h1>
        </div>
        <div className="msg err">That campaign no longer exists.</div>
        <Link href="/settings/stages" className="btn ghost">
          Back to the shared pipeline
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="head">
        <h1>Pipeline stages</h1>
        <div className="spacer" />
        <Link href="/pipeline" className="btn ghost">
          View pipeline
        </Link>
      </div>

      <p className="board-hint">
        The stages every deal moves through, in order. Rename them, re-order them, set how likely
        a deal is to close at each one, and give a campaign its own set when it does not follow
        the usual path.
      </p>

      {/* Which pipeline is being edited. The shared one is first because it is
          what most campaigns use and what a new campaign starts on. */}
      <div className="tabs">
        <Link href="/settings/stages" className={formId ? "" : "on"}>
          Shared pipeline
        </Link>
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/settings/stages?form=${c.id}`}
            className={formId === c.id ? "on" : ""}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {formId === null && (
        <p className="board-hint">
          Used by every campaign that has not been given its own, and by leads that came from no
          campaign at all.
        </p>
      )}

      <StageEditor
        key={formId ?? "shared"}
        pipeline={pipeline}
        formId={formId}
        formName={active?.name}
      />
    </>
  );
}

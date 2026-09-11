"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import {
  createMetaDataset,
  deleteMetaDataset,
  flushMetaEvents,
  retryMetaEvents,
  testMetaDataset,
  updateMetaDataset,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Result<T = unknown> = ({ ok: true } & T) | { error: string };

function fail(e: unknown, fallback: string): { error: string } {
  return { error: e instanceof ApiError ? e.message : fallback };
}

/**
 * The form posts a plain object rather than typed arguments because the shape
 * is the same for create and edit, and the plugin already validates every
 * field. Anything the plugin rejects comes back as a sentence to show.
 */
export async function saveMetaDatasetAction(
  id: number | null,
  body: Record<string, unknown>
): Promise<Result> {
  // These credentials can post events into a live ad account, so they sit
  // behind the same door as the WhatsApp ones and the site keys.
  const me = await requireSuperAdmin();

  try {
    if (id) await updateMetaDataset(me, id, body);
    else await createMetaDataset(me, body);
  } catch (e) {
    return fail(e, "Could not save that dataset.");
  }

  revalidatePath("/settings/meta");
  return { ok: true };
}

export async function deleteMetaDatasetAction(id: number): Promise<Result> {
  const me = await requireSuperAdmin();
  try {
    await deleteMetaDataset(me, id);
  } catch (e) {
    return fail(e, "Could not remove that dataset.");
  }
  revalidatePath("/settings/meta");
  return { ok: true };
}

/** Proves the connection now, rather than waiting to see if events appear. */
export async function testMetaDatasetAction(
  id: number
): Promise<Result<{ note: string; trace: string }>> {
  const me = await requireSuperAdmin();
  try {
    const res = await testMetaDataset(me, id);
    revalidatePath("/settings/meta");
    return { ok: true, note: res.note, trace: res.trace };
  } catch (e) {
    // Meta's own message is far more useful than anything we could invent —
    // it names the permission or field that is wrong.
    return fail(e, "Meta rejected the test event.");
  }
}

export async function flushMetaEventsAction(): Promise<
  Result<{ sent: number; failed: number; error: string }>
> {
  const me = await requireSuperAdmin();
  try {
    const res = await flushMetaEvents(me);
    revalidatePath("/settings/meta");
    return { ok: true, sent: res.sent, failed: res.failed, error: res.error };
  } catch (e) {
    return fail(e, "Could not send the queued events.");
  }
}

export async function retryMetaEventsAction(): Promise<
  Result<{ requeued: number; sent: number; failed: number; error: string }>
> {
  const me = await requireSuperAdmin();
  try {
    const res = await retryMetaEvents(me);
    revalidatePath("/settings/meta");
    return { ok: true, requeued: res.requeued, sent: res.sent, failed: res.failed, error: res.error };
  } catch (e) {
    return fail(e, "Could not retry the failed events.");
  }
}

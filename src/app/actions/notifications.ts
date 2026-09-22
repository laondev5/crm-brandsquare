"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { cancelAnnouncement, readNotifications, saveAnnouncement, type AnnouncementInput } from "@/lib/queries";
import { ApiError } from "@/lib/api";

/** Marks some or all of the signed-in person's notifications as read. */
export async function readNotificationsAction(opts: { ids?: number[]; all?: boolean }) {
  const me = await requireMember();
  try {
    const r = await readNotifications(me, opts);
    revalidatePath("/work");
    return { ok: true as const, unread: r.unread };
  } catch {
    return { error: "Could not update your notifications." };
  }
}

type Result = { ok: string } | { error: string };

/** Posts now, or schedules, an announcement to everyone or to the people tagged. */
export async function saveAnnouncementAction(_prev: Result | null, form: FormData): Promise<Result> {
  const me = await requireMember();
  const id = Number(form.get("id")) || null;
  const when = String(form.get("when") ?? "now");
  const body: AnnouncementInput = {
    title: String(form.get("title") ?? "").trim(),
    body: String(form.get("body") ?? "").trim(),
    audience: form.get("audience") === "people" ? "people" : "all",
    people: form.getAll("people").map(Number).filter(Boolean),
    publish_at: when === "later" ? String(form.get("publish_at") ?? "").trim() : "",
    send_email: form.get("send_email") === "1",
  };
  if (!body.title) return { error: "Give the announcement a title." };
  if (!body.body) return { error: "Write the announcement." };
  if (body.audience === "people" && !body.people?.length) return { error: "Tag at least one person, or choose Everyone." };
  if (when === "later" && !body.publish_at) return { error: "Pick when it should go out." };

  try {
    const r = await saveAnnouncement(me, id, body);
    revalidatePath("/announcements");
    const who = body.audience === "all" ? "everyone" : `${r.recipients} ${r.recipients === 1 ? "person" : "people"}`;
    return {
      ok:
        r.announcement.status === "published"
          ? `Posted. It is in ${who}'s notifications${body.send_email ? " and on its way by email" : ""}.`
          : `Scheduled. It goes out to ${who} at the time you chose.`,
    };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save the announcement." };
  }
}

export async function cancelAnnouncementAction(id: number): Promise<Result> {
  const me = await requireMember();
  try {
    await cancelAnnouncement(me, id);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not remove it." };
  }
  revalidatePath("/announcements");
  return { ok: "Removed." };
}

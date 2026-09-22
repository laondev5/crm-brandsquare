"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { cancelMeeting, createMeeting, markMeetingSeen, updateMeeting, type MeetingInput } from "@/lib/queries";
import { ApiError } from "@/lib/api";

type Result = { ok: string } | { error: string };

function read(form: FormData): MeetingInput {
  return {
    title: String(form.get("title") ?? "").trim(),
    agenda: String(form.get("agenda") ?? "").trim(),
    start_at: String(form.get("start_at") ?? "").trim(),
    duration_min: Number(form.get("duration_min")) || 30,
    meet_url: String(form.get("meet_url") ?? "").trim(),
    people: form.getAll("people").map(Number).filter(Boolean),
  };
}

/**
 * Schedules a meeting. The plugin sends the invites (with a calendar file) and,
 * ten minutes before, the reminders; the CRM shows the same in the app.
 */
export async function saveMeetingAction(_prev: Result | null, form: FormData): Promise<Result> {
  const me = await requireMember();
  const id = Number(form.get("id")) || 0;
  const body = read(form);

  if (!body.title) return { error: "Give the meeting a title." };
  if (!body.start_at) return { error: "Pick a date and time." };
  // The link may be blank: with a Google account connected the plugin makes
  // the room, and without one it answers with the exact thing to fix.
  if (!body.people?.length) return { error: "Tag at least one person to invite." };

  try {
    if (id) {
      await updateMeeting(me, id, body);
    } else {
      const res = await createMeeting(me, body);
      revalidatePath("/meetings");
      revalidatePath("/work");
      return {
        ok: `Meeting scheduled. ${res.meeting.people.length - 1} ${
          res.meeting.people.length - 1 === 1 ? "person has" : "people have"
        } been invited and will be reminded 10 minutes before.`,
      };
    }
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save the meeting." };
  }
  revalidatePath("/meetings");
  revalidatePath("/work");
  return { ok: "Meeting updated. Everyone in it has been told what changed." };
}

export async function cancelMeetingAction(id: number): Promise<Result> {
  const me = await requireMember();
  try {
    await cancelMeeting(me, id);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not cancel the meeting." };
  }
  revalidatePath("/meetings");
  revalidatePath("/work");
  return { ok: "Meeting cancelled. Everyone in it has been told." };
}

export async function seenMeetingAction(id: number): Promise<Result> {
  const me = await requireMember();
  try {
    await markMeetingSeen(me, id);
  } catch {
    // Only a badge; nothing to report.
  }
  return { ok: "" };
}

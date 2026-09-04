"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createTrackerRecord,
  deleteTrackerRecord,
  updateTrackerRecord,
  type TrackerInput,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { getTracker, NO_VALUE, PRIORITIES, type TrackerDef } from "@/lib/trackers";
import type { FormState } from "./auth";
import { isAdminRole } from "@/lib/types";

/**
 * Turns a submitted form into the shape the API takes, using the tracker's own
 * schema as the allow-list. Anything not declared in lib/trackers.ts is
 * dropped rather than stored, so a hand-crafted POST cannot smuggle arbitrary
 * keys into the JSON column.
 */
function readForm(def: TrackerDef, form: FormData): TrackerInput | { error: string } {
  const out: TrackerInput = { tracker: def.key, title: "", data: {} };
  const data: Record<string, string> = {};

  for (const field of def.fields) {
    const raw = form.get(`f_${field.key}`);
    let val = raw === null ? "" : String(raw).trim();

    // The dropdowns send a sentinel for "no answer" — see NO_VALUE.
    if (val === NO_VALUE) val = "";

    if (field.type === "select" && val) {
      const allowed =
        field.column === "status"
          ? def.statuses
          : field.column === "priority"
          ? PRIORITIES
          : field.options ?? [];
      if (!(allowed as readonly string[]).includes(val)) val = "";
    }

    if (field.type === "yesno" && val && val !== "Yes" && val !== "No") val = "";

    if (field.type === "number" && val && !/^-?\d+(\.\d+)?$/.test(val)) {
      return { error: `${field.label} must be a number.` };
    }

    if (field.type === "date" && val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return { error: `${field.label} is not a valid date.` };
    }

    switch (field.column) {
      case "title":
        out.title = val.slice(0, 255);
        break;
      case "status":
        out.status = val;
        break;
      case "priority":
        out.priority = val;
        break;
      case "owner_name":
        out.owner_name = val.slice(0, 190);
        break;
      case "entry_date":
        out.entry_date = val || null;
        break;
      case "due_date":
        out.due_date = val || null;
        break;
      default:
        // Only keep what was actually filled in — empty strings would bloat
        // every row's JSON with keys that mean nothing.
        if (val) data[field.key] = val.slice(0, 2000);
    }
  }

  if (!out.title) {
    const titleField = def.fields.find((f) => f.column === "title");
    return { error: `${titleField?.label ?? "Title"} is required.` };
  }

  out.data = data;
  return out;
}

export async function saveTrackerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();

  const def = getTracker(String(form.get("tracker") ?? ""));
  if (!def) return { error: "Unknown tracker." };

  const parsed = readForm(def, form);
  if ("error" in parsed) return parsed;

  const id = Number(form.get("id")) || 0;
  const scope = isAdminRole(me.role) ? null : me.id;

  try {
    if (id) {
      await updateTrackerRecord(id, parsed, scope);
    } else {
      // A sub-admin's own entries are stamped with their id so their view
      // stays scoped; an admin can leave it against whoever they named.
      await createTrackerRecord(
        { ...parsed, owner_id: isAdminRole(me.role) ? undefined : me.id },
        me
      );
    }
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    return { error: "Could not save that entry. Please try again." };
  }

  revalidatePath(`/tracker/${def.key}`);
  revalidatePath("/tracker");
  return { ok: id ? "Entry updated." : "Entry added." };
}

/** Inline status change from the list, without opening the editor. */
export async function setTrackerStatusAction(
  id: number,
  trackerKey: string,
  status: string
): Promise<{ ok: true } | { error: string }> {
  const me = await requireUser();

  const def = getTracker(trackerKey);
  if (!def) return { error: "Unknown tracker." };
  if (!(def.statuses as readonly string[]).includes(status)) {
    return { error: "Unknown status." };
  }

  const scope = isAdminRole(me.role) ? null : me.id;

  try {
    await updateTrackerRecord(id, { status }, scope);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    return { error: "Could not save that change." };
  }

  revalidatePath(`/tracker/${trackerKey}`);
  revalidatePath("/tracker");
  return { ok: true };
}

export async function deleteTrackerAction(
  id: number,
  trackerKey: string
): Promise<{ ok: true } | { error: string }> {
  const me = await requireUser();
  if (!getTracker(trackerKey)) return { error: "Unknown tracker." };

  const scope = isAdminRole(me.role) ? null : me.id;

  try {
    await deleteTrackerRecord(id, scope);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { error: e.message };
    return { error: "Could not delete that entry." };
  }

  revalidatePath(`/tracker/${trackerKey}`);
  revalidatePath("/tracker");
  return { ok: true };
}

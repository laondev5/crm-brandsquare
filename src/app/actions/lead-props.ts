"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { appendLeadProperties, saveLeadProperties, updateLead } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { isAdminRole, type LeadProperty, type LeadPropertyType } from "@/lib/types";

type Fail = { error: string };

export async function saveLeadPropertiesAction(
  properties: LeadProperty[]
): Promise<{ properties: LeadProperty[] } | Fail> {
  const me = await requireAdmin();
  const labels = properties.map((p) => p.label.trim().toLowerCase()).filter(Boolean);
  if (new Set(labels).size !== labels.length) return { error: "Two properties have the same name." };
  const noOptions = properties.find((p) => p.type === "select" && p.label.trim() && p.options.length === 0);
  if (noOptions) return { error: `Add at least one choice to “${noOptions.label}”.` };

  try {
    const res = await saveLeadProperties(me, properties);
    revalidatePath("/settings/lead-properties");
    revalidatePath("/leads");
    return { properties: res.properties };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save the properties." };
  }
}

/** Creates text properties from spreadsheet column names during an import. */
export async function createPropertiesFromColumnsAction(
  labels: string[]
): Promise<{ properties: LeadProperty[] } | Fail> {
  const me = await requireUser();
  try {
    const res = await appendLeadProperties(me, labels);
    return { properties: res.properties };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not create those properties." };
  }
}

/**
 * "+ Add a field" on a lead: creates the property for every lead (if it does
 * not exist already) and fills it in on this one. Admins and sub-admins alike —
 * the detail is usually learned on a call by whoever made it.
 */
export async function addLeadFieldAction(
  leadId: number,
  field: { label: string; type: LeadPropertyType; options: string[]; value: string }
): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  const label = field.label.trim();
  if (!label) return { error: "Name the field." };
  if (field.type === "select" && field.options.length === 0) return { error: "Add at least one choice." };

  try {
    const res = await appendLeadProperties(me, [], [{ label, type: field.type, options: field.options }]);
    const prop = res.properties.find((p) => p.label.trim().toLowerCase() === label.toLowerCase());
    if (!prop) return { error: "Could not create that field." };
    if (field.value.trim()) {
      await updateLead(leadId, me, { props: { [prop.key]: field.value.trim() } }, isAdminRole(me.role) ? null : me.id);
    }
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/settings/lead-properties");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not add that field." };
  }
}

/** Saves the property values on one lead. Blank clears a value. */
export async function updateLeadPropsAction(
  leadId: number,
  props: Record<string, string>
): Promise<{ ok: true } | Fail> {
  const me = await requireUser();
  const scope = isAdminRole(me.role) ? null : me.id;
  try {
    await updateLead(leadId, me, { props }, scope);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save those details." };
  }
}

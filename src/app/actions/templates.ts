"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createTemplate, deleteTemplate } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { TemplateChannel } from "@/lib/types";

type Result = { ok: true } | { error: string };

const CHANNELS: TemplateChannel[] = ["note", "email", "whatsapp"];

export async function saveTemplateAction(input: {
  name: string;
  channel: string;
  subject: string;
  body: string;
}): Promise<Result> {
  const me = await requireUser();

  const name = input.name.trim();
  if (!name) return { error: "Give the template a name." };
  if (!input.body.trim()) return { error: "A template with no message would not save you anything." };

  const channel = (CHANNELS as string[]).includes(input.channel) ? input.channel : "note";

  try {
    await createTemplate({
      actor: me,
      name,
      channel,
      // Only email carries a subject; storing one against WhatsApp would show
      // an empty field on a channel that has no such thing.
      subject: channel === "email" ? input.subject.trim() : "",
      body: input.body,
    });
    revalidatePath("/templates");
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not save that template." };
  }
}

export async function deleteTemplateAction(id: number): Promise<Result> {
  await requireUser();
  try {
    await deleteTemplate(id);
    revalidatePath("/templates");
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not remove that template." };
  }
}

import "server-only";

import { createHmac } from "node:crypto";
import type { DashUser } from "./types";

/**
 * Permission to talk straight to WordPress, without the bytes passing through
 * this app at all.
 *
 * It has to work this way. This dashboard runs on Vercel, which rejects any
 * request body over 4.5 MB at its edge -- before a line of our code runs, and
 * with no setting to raise it (and it will not carry a response that large
 * either). A 16 MB video cannot travel through here, nor can a year of
 * WhatsApp history as a zip, so they do not: the browser sends or fetches them
 * from WordPress directly and only a pass goes through the dashboard.
 *
 * A pass is a short payload signed with the API key, so the key itself never
 * reaches a browser. It names one person, says what it is for, and expires in
 * five minutes, which bounds what a leaked one is worth. WordPress still checks
 * that the person named may do the thing at all, at the moment they do it.
 */
const KEY = process.env.WP_API_KEY ?? "";
const BASE = (process.env.WP_API_URL ?? "").trim().replace(/\/+$/, "");

/** Five minutes: long enough to choose a file and read it back, short enough
 *  that a pass left in a log is of no use by the time anyone finds it. */
const GOOD_FOR_SECONDS = 300;

export interface UploadPass {
  url: string;
  ticket: string;
}

/** base64url, unpadded -- the plugin verifies against exactly this shape. */
function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", KEY).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function expiry(): number {
  return Math.floor(Date.now() / 1000) + GOOD_FOR_SECONDS;
}

/**
 * A pass for one purpose. `k` is what stops a pass for one thing being replayed
 * for another: a ticket to download a backup is worthless for sending mail.
 */
function purposePass(purpose: string, actor: DashUser, extra: Record<string, unknown> = {}): string {
  return sign({ k: purpose, a: actor.id, n: actor.name, exp: expiry(), ...extra });
}

/** WhatsApp media into one conversation. Predates purposes, so it has none. */
export function mediaUploadPass(conversationId: number, actor: DashUser): UploadPass {
  return {
    url: `${BASE}/whatsapp/conversations/${conversationId}/media-direct`,
    ticket: sign({ c: conversationId, a: actor.id, n: actor.name, exp: expiry() }),
  };
}

/** The WhatsApp backup archive: a link, because the browser downloads it itself. */
export function waBackupDownloadUrl(actor: DashUser): string {
  return `${BASE}/whatsapp/backup/download?ticket=${encodeURIComponent(purposePass("wa-backup", actor))}`;
}

/** Sending an email with attachments, straight from the browser. */
export function mailSendPass(actor: DashUser): UploadPass {
  return { url: `${BASE}/mail/send-direct`, ticket: purposePass("mail", actor) };
}

/** One attachment, as a download. The pass names the file so it cannot be used for another. */
export function mailAttachmentUrl(attachmentId: number, actor: DashUser): string {
  const ticket = purposePass("mail-file", actor, { r: attachmentId });
  return `${BASE}/mail/attachments/${attachmentId}/download?ticket=${encodeURIComponent(ticket)}`;
}

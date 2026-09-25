import "server-only";

import { createHmac } from "node:crypto";
import type { DashUser } from "./types";

/**
 * Permission to post a file straight to WordPress, without it passing through
 * this app at all.
 *
 * It has to work this way. This dashboard runs on Vercel, which rejects any
 * request body over 4.5 MB at its edge — before a line of our code runs, and
 * with no setting to raise it. A 16 MB video cannot travel through here, so it
 * does not: the browser sends it to WordPress directly and only this ticket
 * goes through the dashboard.
 *
 * The ticket is a short payload signed with the API key, so the key itself
 * never reaches a browser. It names one conversation and one person, and it
 * expires in five minutes, which bounds what a leaked one is worth to a file
 * in that single thread, briefly. WordPress still checks that the person named
 * may send WhatsApp messages at all.
 */
const KEY = process.env.WP_API_KEY ?? "";
const BASE = (process.env.WP_API_URL ?? "").trim().replace(/\/+$/, "");

/** Five minutes: long enough to choose a file and read it back, short enough
 *  that a ticket left in a log is of no use by the time anyone finds it. */
const GOOD_FOR_SECONDS = 300;

export interface UploadPass {
  url: string;
  ticket: string;
}

export function mediaUploadPass(conversationId: number, actor: DashUser): UploadPass {
  const payload = {
    c: conversationId,
    a: actor.id,
    n: actor.name,
    exp: Math.floor(Date.now() / 1000) + GOOD_FOR_SECONDS,
  };

  // base64url, unpadded — the plugin verifies against exactly this shape.
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", KEY).update(body).digest("base64url");

  return {
    url: `${BASE}/whatsapp/conversations/${conversationId}/media-direct`,
    ticket: `${body}.${signature}`,
  };
}

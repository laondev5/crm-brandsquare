import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

/**
 * Streams one message's media through to the browser.
 *
 * The browser has no WhatsApp access token and never should — the plugin
 * fetches from Meta and hands back base64 in a JSON envelope, which this
 * route decodes into real bytes with the right content type. A route rather
 * than an <img src> straight at the plugin because the plugin's own auth is
 * a shared key the browser cannot be trusted to hold; this is the same
 * signed-in-session boundary every other page in the dashboard uses.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  if (!me) return new NextResponse("Not signed in", { status: 401 });

  const { id } = await params;

  try {
    const res = await api.get<{ mime: string; data: string }>(`/whatsapp/messages/${id}/media`);
    const bytes = Buffer.from(res.data, "base64");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": res.mime || "application/octet-stream",
        // A customer's photo is worth caching for the session, not forever —
        // Meta's own media URLs expire, and there is no reason to assume this
        // one will still resolve to the same bytes next week.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    const message = e instanceof ApiError ? e.message : "Could not load media.";
    return new NextResponse(message, { status });
  }
}

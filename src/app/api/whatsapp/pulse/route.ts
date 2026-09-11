import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getWaConversations, getWaThread } from "@/lib/queries";
import { waSignature } from "@/lib/types";

/**
 * Answers "has anything changed?" for the open inbox.
 *
 * WordPress cannot push to the browser, so the inbox asks every few seconds.
 * Asking here returns a fingerprint rather than the messages themselves, which
 * keeps each check tiny; the page only reloads its data when the fingerprint
 * moves. It is computed from the same search and open thread the page is
 * showing, or a filtered list would never match and reload on every check.
 */
export async function GET(req: Request) {
  const me = await requireUser();
  if (!me) return new NextResponse("Not signed in", { status: 401 });

  const q = new URL(req.url).searchParams;
  const selected = Number(q.get("c")) || null;

  try {
    const data = await getWaConversations(q.get("q") || undefined);
    const thread = selected ? await getWaThread(selected).catch(() => null) : null;
    return NextResponse.json(
      { sig: waSignature(data.conversations, thread?.messages) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the inbox." }, { status: 502 });
  }
}

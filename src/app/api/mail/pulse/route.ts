import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMailPulse } from "@/lib/queries";

/**
 * Answers "has anything changed?" for the open email inbox.
 *
 * The same idea as the WhatsApp one: a fingerprint rather than the mail itself,
 * so each check is tiny and the page reloads its data only when the fingerprint
 * moves. Asking also gives WordPress a quiet chance to look in Gmail for
 * anything new, which is how mail arrives without anyone pressing a button.
 */
export async function GET(req: Request) {
  const me = await requireUser();
  const thread = Number(new URL(req.url).searchParams.get("t")) || undefined;

  try {
    const res = await getMailPulse(me, thread);
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach the inbox." }, { status: 502 });
  }
}

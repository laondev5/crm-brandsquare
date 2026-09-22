import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { pulse } from "@/lib/queries";

/**
 * The one live check behind the bell and the pop-ups: unread count, meetings
 * about to start, unseen invites and fresh announcements. Each open CRM tab
 * asks every half minute, which also makes the plugin send anything due.
 */
export async function GET() {
  const me = await currentUser();
  if (!me) return new NextResponse("Not signed in", { status: 401 });
  try {
    return NextResponse.json(await pulse(me), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { unread: 0, soon: [], invites: [], announcements: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

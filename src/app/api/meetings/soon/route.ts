import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { meetingsSoon } from "@/lib/queries";

/**
 * The live check behind the meeting pop-ups: meetings about to start (or
 * running) and invites not yet seen. Every open CRM tab asks this every half
 * minute, which is also what makes the plugin send reminders on time.
 */
export async function GET() {
  const me = await currentUser();
  if (!me) return new NextResponse("Not signed in", { status: 401 });
  try {
    const data = await meetingsSoon(me);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ soon: [], invites: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}

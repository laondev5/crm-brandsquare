import { NextResponse } from "next/server";
import { marketRates } from "@/lib/fx";

/**
 * Today's market rates for the document forms.
 *
 * Public on purpose: an exchange rate is not company data. It is cached for an
 * hour at the edge, so a form opened by ten people costs one upstream call.
 */
export async function GET(request: Request) {
  const base = new URL(request.url).searchParams.get("base") || "USD";
  const snapshot = await marketRates(base);

  // An empty table is not a rate anyone should keep: the next visit should try
  // the provider again instead of showing "no market rate" for an hour.
  const cache = Object.keys(snapshot.rates).length
    ? "public, s-maxage=3600, stale-while-revalidate=86400"
    : "no-store";

  return NextResponse.json(snapshot, { headers: { "Cache-Control": cache } });
}

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getPipeline, listLeads } from "@/lib/queries";
import { isAdminRole, parsePayload, stageLabel } from "@/lib/types";

/**
 * Leads as a spreadsheet.
 *
 * A route rather than a server action because the browser has to receive a
 * file, and an action returns data to React. Whatever the current view is
 * filtered to is what comes out — exporting something different from what is
 * on screen is how people end up sending the wrong list to a client.
 */
export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return new NextResponse("Not signed in", { status: 401 });

  const url = new URL(req.url);
  const scope = isAdminRole(me.role) ? null : me.id;

  const pipeline = await getPipeline();

  // Paged through rather than asked for in one go: the plugin caps a page, and
  // a silent truncation would produce a file that looks complete and is not.
  const rows = [];
  for (let page = 1; page <= 50; page++) {
    const res = await listLeads({
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("s") ?? undefined,
      formId: Number(url.searchParams.get("form")) || null,
      siteId: url.searchParams.get("site") === "this" ? "this" : Number(url.searchParams.get("site")) || null,
      ownerId: scope,
      perPage: 100,
      page,
    });
    rows.push(...res.rows);
    if (page >= res.pages || res.rows.length === 0) break;
  }

  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Quote everything: a lead called O'Brien, Ltd or an answer containing a
    // newline will otherwise split a row in half once Excel opens it.
    return `"${s.replace(/"/g, '""')}"`;
  };

  const header = [
    "ID", "Name", "Email", "Phone", "Stage", "Owner", "Campaign", "Website",
    "Received", "Last activity", "Next action", "Lost reason", "Answers",
  ];

  const body = rows.map((l) =>
    [
      l.id,
      l.name,
      l.email,
      l.phone,
      stageLabel(pipeline, l.status),
      l.owner ?? "Unassigned",
      l.form_name ?? "",
      l.site_name ?? "This site",
      l.created_at,
      l.last_activity_at ?? "",
      l.next_action_at ?? "",
      l.lost_reason ?? "",
      parsePayload(l.payload)
        .map((a) => `${a.label}: ${a.value}`)
        .join(" | "),
    ]
      .map(cell)
      .join(",")
  );

  // The BOM is what makes Excel read UTF-8 rather than mangling accented names.
  const csv = "﻿" + [header.map(cell).join(","), ...body].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brandsquare-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

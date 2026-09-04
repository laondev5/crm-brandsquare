"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeSiteAction, setSiteStatusAction } from "@/app/actions/sites";
import type { Site } from "@/lib/types";

export default function SiteRow({ site }: { site: Site }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: true } | { error: string }>) => {
    setErr("");
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  const revoked = site.status === "revoked";

  return (
    <tr>
      <td data-l="Website">
        <strong style={{ color: "var(--ink)" }}>{site.name}</strong>
        {site.url && (
          <>
            <br />
            <small style={{ color: "var(--muted)" }}>{site.url}</small>
          </>
        )}
        {err && (
          <>
            <br />
            <small style={{ color: "var(--err)" }}>{err}</small>
          </>
        )}
      </td>

      <td data-l="Leads">
        <Link href={`/leads?site=${site.id}`} className="name">
          {site.leads}
        </Link>
      </td>

      {/* Traffic sits beside leads because the two arrive by different routes:
          a site can be delivering enquiries while its tracking is switched off,
          and a zero here is what says so. */}
      <td data-l="Traffic">
        {site.views ? (
          <Link href={`/analytics?site=${site.id}`} className="name">
            {site.views.toLocaleString()}
          </Link>
        ) : (
          <span style={{ color: "var(--warn)", fontWeight: 600 }}>None yet</span>
        )}
        {site.last_visit && (
          <>
            <br />
            <small style={{ color: "var(--muted)" }}>{fmt(site.last_visit)}</small>
          </>
        )}
      </td>

      <td data-l="Last received">
        {site.last_seen_at ? fmt(site.last_seen_at) : <span style={{ color: "var(--muted)" }}>Never</span>}
      </td>

      <td data-l="Status">
        <span className={`pill ${revoked ? "s-disabled" : "s-active"}`}>
          {revoked ? "Revoked" : "Active"}
        </span>
      </td>

      <td data-l="">
        <div className="tk-actions">
          {/* Revoking stops the site sending without touching the leads it has
              already delivered — the usual thing you want when a site is being
              rebuilt or handed over. */}
          <button
            className="btn ghost sm"
            disabled={busy}
            onClick={() => run(() => setSiteStatusAction(site.id, revoked ? "active" : "revoked"))}
          >
            {revoked ? "Re-enable" : "Revoke"}
          </button>

          <button
            className="btn danger sm"
            disabled={busy}
            aria-label={`Remove ${site.name}`}
            onClick={() => {
              if (
                !confirm(
                  `Remove ${site.name}? Its ${site.leads} lead(s) stay in the CRM — only the connection goes, and that site can no longer send new ones.`
                )
              )
                return;
              run(() => removeSiteAction(site.id));
            }}
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

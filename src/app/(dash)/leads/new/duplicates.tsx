"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { findDuplicatesAction } from "../../../actions/leads";
import type { DuplicateMatch } from "@/lib/types";

/**
 * Warns that this person may already be in the CRM.
 *
 * It is a warning and never a block. The same person genuinely does enquire
 * twice — a second machine, a year later — and a form that refuses the second
 * enquiry only teaches people to put a full stop in the email address to get
 * past it. Showing what already exists, with a link, lets whoever is typing
 * make the call.
 */
export default function Duplicates({ email, phone }: { email: string; phone: string }) {
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);

  useEffect(() => {
    const e = email.trim();
    const p = phone.trim();

    // Matching the server's own floor: fewer than 7 digits is not a phone
    // number worth searching on, and would match half the database.
    const digits = p.replace(/[^0-9]/g, "");
    if (!e.includes("@") && digits.length < 7) {
      setMatches([]);
      return;
    }

    // Debounced, and cancelled on the next keystroke: without the guard a
    // slow early request can land after a fast later one and show matches for
    // an address that has since been typed over.
    let live = true;
    const t = setTimeout(() => {
      findDuplicatesAction(e, p)
        .then((rows) => {
          if (live) setMatches(rows);
        })
        .catch(() => {
          if (live) setMatches([]);
        });
    }, 450);

    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [email, phone]);

  if (matches.length === 0) return null;

  return (
    <div className="msg warn" style={{ marginTop: 10 }}>
      <strong>
        {matches.length === 1 ? "This looks like a lead you already have" : "These look like leads you already have"}
      </strong>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        {matches.map((m) => (
          <li key={m.id} style={{ marginBottom: 4 }}>
            <Link href={`/leads/${m.id}`} target="_blank" style={{ fontWeight: 600 }}>
              #{m.id} {m.name || "(no name)"}
            </Link>
            {m.email ? ` · ${m.email}` : ""}
            {m.phone ? ` · ${m.phone}` : ""}
            <small style={{ color: "var(--muted)" }}> · added {fmt(m.created_at)}</small>
          </li>
        ))}
      </ul>
      <small style={{ display: "block", marginTop: 6, color: "var(--muted)" }}>
        You can still add this one — a repeat enquiry is a real thing.
      </small>
    </div>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

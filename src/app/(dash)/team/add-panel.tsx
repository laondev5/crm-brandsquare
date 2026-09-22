"use client";

import { useState } from "react";
import NewSubadmin from "./new";
import type { Role } from "@/lib/types";

/**
 * The add form, folded away until it is wanted.
 *
 * It used to sit in a 340px column beside the table, which left the members
 * themselves squeezed into whatever was left — the rank dropdown came out
 * narrower than the word inside it and the row actions wrapped on top of each
 * other. Adding someone happens a few times a year; reading the table happens
 * every time the page is opened, so the table gets the width.
 */
export default function AddPanel({ meRole }: { meRole: Role }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Add a team member
      </button>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <NewSubadmin meRole={meRole} />
      <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { addWaToLeadsAction } from "@/app/actions/whatsapp";

/**
 * Puts the person writing in on the leads list.
 *
 * Shown only where there is no lead yet. It still checks before it adds: the
 * number is matched against the leads already on file, so someone who bought
 * last year is linked to the record they have rather than starting a second
 * one, and the button says which of the two happened.
 */
export default function AddToLeads({ id }: { id: number }) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const add = () =>
    start(async () => {
      setError(null);
      const res = await addWaToLeadsAction([id]);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setNote(res.created ? "Added to leads" : res.linked ? "Matched an existing lead" : "Already a lead");
      router.refresh();
    });

  if (error) {
    return (
      <span className="pill" style={{ background: "#fdeceb", color: "var(--err)" }} title={error}>
        {error}
      </span>
    );
  }
  if (note) return <span className="pill s-active">{note}</span>;

  return (
    <button type="button" className="btn ghost sm" onClick={add} disabled={busy} title="Put this person on the leads list">
      <UserPlus className="size-3" /> {busy ? "Adding…" : "Add to leads"}
    </button>
  );
}

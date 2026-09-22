"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAnnouncementAction } from "@/app/actions/notifications";

export default function RemoveAnnouncement({ id, scheduled }: { id: number; scheduled: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      className="btn ghost sm"
      disabled={busy}
      style={{ color: "var(--err)" }}
      onClick={() => {
        if (!confirm(scheduled ? "Cancel this scheduled announcement? It will not be sent." : "Remove this announcement for everyone?")) return;
        start(async () => {
          const r = await cancelAnnouncementAction(id);
          if ("error" in r) alert(r.error);
          router.refresh();
        });
      }}
    >
      {busy ? "Removing…" : scheduled ? "Cancel" : "Remove"}
    </button>
  );
}

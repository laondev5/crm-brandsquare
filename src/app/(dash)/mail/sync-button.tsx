"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncMailAction } from "@/app/actions/mail";

/** "Check now": ask Gmail straight away instead of waiting for the next automatic look. */
export default function SyncButton() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  return (
    <>
      {err && (
        <span role="alert" style={{ color: "var(--err)", fontSize: 12, maxWidth: 280 }}>
          {err}
        </span>
      )}
      <button
        type="button"
        className="btn ghost"
        disabled={busy}
        title="Look in Gmail for new mail now"
        onClick={() =>
          start(async () => {
            setErr("");
            const res = await syncMailAction();
            if ("error" in res) setErr(res.error);
            router.refresh();
          })
        }
      >
        <RefreshCw className="size-3" aria-hidden="true" style={{ marginRight: 4 }} />
        {busy ? "Checking…" : "Check now"}
      </button>
    </>
  );
}

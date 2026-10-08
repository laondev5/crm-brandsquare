"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { mailToLeadsAction } from "@/app/actions/mail";

/** Makes the person on this conversation a lead, or links the lead they already are. */
export default function AddMailLead({ id }: { id: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  return (
    <>
      {err && (
        <span role="alert" style={{ color: "var(--err)", fontSize: 12 }}>
          {err}
        </span>
      )}
      <button
        type="button"
        className="pill s-active"
        style={{ cursor: "pointer", border: 0 }}
        disabled={busy}
        onClick={() =>
          start(async () => {
            setErr("");
            const res = await mailToLeadsAction([id]);
            if ("error" in res) setErr(res.error);
            else if (res.failed.length) setErr(res.failed[0]);
            router.refresh();
          })
        }
      >
        <UserPlus className="size-3" aria-hidden="true" style={{ marginRight: 4, verticalAlign: "-1px" }} />
        {busy ? "Adding…" : "Add to leads"}
      </button>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteWaConversationsAction } from "@/app/actions/whatsapp";

/**
 * Deletes the conversation being read.
 *
 * The list on the left handles several at once; this is for the common case of
 * having the wrong one open and wanting it gone. Same warning either way,
 * because it is the same irreversible thing.
 */
export default function DeleteChat({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const remove = () =>
    start(async () => {
      const res = await deleteWaConversationsAction([id]);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setAsking(false);
      router.replace("/whatsapp");
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        className="btn ghost sm"
        onClick={() => setAsking(true)}
        title="Delete this conversation"
      >
        <Trash2 className="size-3" /> Delete
      </button>

      {asking && (
        <div className="wa-confirm" role="alertdialog" aria-label="Confirm deletion">
          <div className="wa-confirm__box">
            <strong>Delete the conversation with {name}?</strong>
            <p>
              Every message in it, and every photo, voice note and document, is removed from the CRM
              for everyone. It cannot be undone. If they write again, a new conversation starts.
            </p>
            {error && <div className="msg err">{error}</div>}
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn"
                style={{ background: "var(--err)", borderColor: "var(--err)" }}
                onClick={remove}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Delete it"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setAsking(false)} disabled={busy}>
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

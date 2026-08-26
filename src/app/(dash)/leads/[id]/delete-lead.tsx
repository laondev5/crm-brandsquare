"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteLeadAction } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * A confirm step rather than a bare button, because there is no trash to
 * recover from: the dialog names the lead so a mis-click on the wrong row is
 * visible before it is permanent, and spells out what goes with it.
 *
 * On success the action redirects to /leads — this component never sees a
 * result, which is why only the failure path sets state.
 */
export default function DeleteLead({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [pending, startTransition] = useTransition();

  const label = name || `Lead #${id}`;

  function confirm() {
    setErr("");
    startTransition(async () => {
      const res = await deleteLeadAction(id);
      // A success redirects, and the router resolves that call with nothing —
      // so a result here always means the delete was refused.
      if (res?.error) {
        setErr(res.error);
        setOpen(false);
      }
    });
  }

  return (
    <>
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      <div className="card">
        <h2>Delete this lead</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
          Removes {label}, every note on it and its whole history. Emails already sent stay in the
          campaign record. This cannot be undone.
        </p>
        <Button variant="destructive" className="w-full" onClick={() => setOpen(true)}>
          <Trash2 />
          Delete lead
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {label}?</DialogTitle>
            <DialogDescription>
              The lead, its notes and its activity trail are removed for good. There is no undo.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

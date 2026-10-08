"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenSquare, X } from "lucide-react";
import type { MessageTemplate } from "@/lib/types";
import ComposeForm from "./compose-form";

/** "New email": a message to anyone, not a reply, in front of the inbox. */
export default function ComposeButton({
  templates,
  meName,
}: {
  templates: MessageTemplate[];
  meName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        <PenSquare className="size-3" aria-hidden="true" style={{ marginRight: 4 }} />
        New email
      </button>

      {open && (
        <div className="qt-modal" role="dialog" aria-label="New email">
          <div className="qt-modal__box" style={{ width: "min(680px, 100%)" }}>
            <div className="qt-modal__head">
              <strong>New email</strong>
              <div className="spacer" />
              <button type="button" className="qt-modal__close" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="qt-modal__body">
              <ComposeForm
                templates={templates}
                meName={meName}
                autoFocus
                onCancel={() => setOpen(false)}
                onSent={(id) => {
                  setOpen(false);
                  if (id) router.push(`/mail?t=${id}`);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

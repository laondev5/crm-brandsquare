"use client";

import { useEffect } from "react";
import { markWaReadAction } from "@/app/actions/whatsapp";

/**
 * Fires once when a conversation with unread messages is opened. A separate
 * component rather than an effect inline in Thread so it can key off the
 * conversation id and re-fire on every switch, including between two threads
 * that are both unread.
 */
export default function MarkRead({ id }: { id: number }) {
  useEffect(() => {
    markWaReadAction(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}

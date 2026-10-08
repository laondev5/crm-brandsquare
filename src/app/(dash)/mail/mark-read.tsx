"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markMailReadAction } from "@/app/actions/mail";

/**
 * Fires once when a conversation with unread messages is opened, then refreshes
 * so the unread badge in the list clears. Keyed on the thread, so switching
 * between two unread ones fires for each.
 */
export default function MarkMailRead({ id }: { id: number }) {
  const router = useRouter();
  useEffect(() => {
    markMailReadAction(id).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}

import { redirect } from "next/navigation";

/**
 * The agenda is a tab on My work now — it was a slice of what that page
 * already showed. This keeps old links and bookmarks working.
 */
export default function Page() {
  redirect("/work?tab=followups");
}

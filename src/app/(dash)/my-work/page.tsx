import { redirect } from "next/navigation";

/**
 * My work, Agenda and My day all answered the same question from three
 * angles. They are one page with tabs now; this keeps old links working.
 */
export default function Page() {
  redirect("/work");
}

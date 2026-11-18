import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { isAdminRole } from "@/lib/types";
import CatalogueEditor from "../editor";

export default async function NewCataloguePage() {
  const me = await requireMember();
  if (!isAdminRole(me.role)) notFound();

  return (
    <>
      <div className="head">
        <h1>Add a machine</h1>
        <div className="spacer" />
        <Link href="/catalogue" className="btn ghost">
          The catalogue
        </Link>
      </div>

      <CatalogueEditor canEdit />
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteOrganizationAction } from "@/app/actions/organizations";
import { deleteInvoiceAction } from "@/app/actions/invoices";
import { deleteReceiptAction } from "@/app/actions/receipts";
import { deleteCatalogueAction } from "@/app/actions/catalogue";
import { deleteDealAction } from "@/app/actions/deals";

type Kind = "organization" | "invoice" | "receipt" | "catalogue" | "deal";

export default function DeleteDocument({
  kind,
  id,
  what,
  redirectTo,
  label = "Delete",
}: {
  kind: Kind;
  id: number;
  what: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function run() {
    if (!window.confirm(`Delete ${what}? This cannot be undone.`)) return;
    start(async () => {
      setError(null);
      const res =
        kind === "organization"
          ? await deleteOrganizationAction(id)
          : kind === "invoice"
            ? await deleteInvoiceAction(id)
            : kind === "receipt"
              ? await deleteReceiptAction(id)
              : kind === "deal"
                ? await deleteDealAction(id)
                : await deleteCatalogueAction(id);

      if ("error" in res) setError(res.error);
      else if (redirectTo) router.replace(redirectTo);
      else router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="btn danger" onClick={run} disabled={busy}>
        <Trash2 className="size-3" /> {busy ? "Deleting…" : label}
      </button>
      {error && (
        <div className="msg err" style={{ marginTop: 10, marginBottom: 0 }}>
          {error}
        </div>
      )}
    </>
  );
}

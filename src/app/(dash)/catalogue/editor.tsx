"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCatalogueAction, type CatalogueFormState } from "@/app/actions/catalogue";
import type { CatalogueItem } from "@/lib/types";
import CurrencyPicker from "../quotes/currency-picker";

/**
 * One machine on the catalogue.
 *
 * These are the sheets the team sends when a customer asks what is available:
 * a name, a model, a few specifications and a price. Retiring an item takes it
 * off the catalogue without deleting what was already sent.
 */
export default function CatalogueEditor({
  item = null,
  canEdit,
}: {
  item?: CatalogueItem | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CatalogueFormState, FormData>(saveCatalogueAction, null);
  const [currencyCode, setCurrencyCode] = useState(item?.currency ?? "USD");

  useEffect(() => {
    if (!state?.ok || !state.item) return;
    if (!item) router.replace(`/catalogue/${state.item.id}`);
    else router.refresh();
  }, [state, item, router]);

  return (
    <form action={action} className="card qt-form">
      <input type="hidden" name="id" value={item?.id ?? ""} />

      {state?.error && <div className="msg err">{state.error}</div>}
      {state?.ok && <div className="msg ok">Saved.</div>}

      <h2>The machine</h2>
      <div className="qt-grid">
        <label className="f">
          <span>
            Name <b style={{ color: "var(--p)" }}>*</b>
          </span>
          <input type="text" name="name" required defaultValue={item?.name ?? ""} placeholder="High-speed flour mill" />
        </label>
        <label className="f">
          <span>Model</span>
          <input type="text" name="model" defaultValue={item?.model ?? ""} placeholder="GD-60B" />
        </label>
        <label className="f">
          <span>Category</span>
          <input type="text" name="category" defaultValue={item?.category ?? ""} placeholder="Milling" />
        </label>
        <label className="f">
          <span>Order on the sheet</span>
          <input type="number" name="position" defaultValue={item?.position ?? 0} />
        </label>
      </div>

      <h2 style={{ marginTop: 18 }}>What it says</h2>
      <label className="f">
        <span>Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={item?.description ?? ""}
          placeholder="Industrial flour mill for rice, beans, plantain, corn and sorghum."
        />
      </label>
      <label className="f">
        <span>Suitable for</span>
        <textarea
          name="suitable_for"
          rows={2}
          defaultValue={item?.suitable_for ?? ""}
          placeholder="Commercial flour production, bakeries, animal feed and multi-grain processing."
        />
      </label>
      <label className="f">
        <span>Key specifications — one per line</span>
        <textarea
          name="specs"
          rows={5}
          defaultValue={item?.specs ?? ""}
          placeholder={"Capacity: 400–800 kg/hr\nGrinding motor: 22 kW\nTotal power: 34.1 kW"}
        />
      </label>

      <h2 style={{ marginTop: 18 }}>Price and picture</h2>
      <div className="qt-grid">
        <label className="f">
          <span>Price</span>
          <input type="text" inputMode="decimal" name="price" defaultValue={item ? String(item.price) : ""} placeholder="12,500" />
        </label>
        <label className="f">
          <span>Currency</span>
          <CurrencyPicker value={currencyCode} onChange={setCurrencyCode} />
        </label>
        <label className="f">
          <span>Image address</span>
          <input
            type="text"
            name="image_url"
            defaultValue={item?.image_url ?? ""}
            placeholder="https://brandsquare.ng/wp-content/uploads/…jpg"
          />
        </label>
        <label className="f">
          <span>On the catalogue</span>
          <span className="row" style={{ gap: 8, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" name="active" value="1" defaultChecked={item ? item.active : true} />
            Show this machine
          </span>
        </label>
      </div>

      {canEdit ? (
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={pending}>
            {pending ? "Saving…" : item ? "Save changes" : "Add to the catalogue"}
          </button>
        </div>
      ) : (
        <p className="empty" style={{ marginTop: 16 }}>
          Only an admin can change the catalogue.
        </p>
      )}
    </form>
  );
}

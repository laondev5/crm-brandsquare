import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getCatalogueItem, getDocSettings } from "@/lib/queries";
import { isAdminRole, money } from "@/lib/types";
import CatalogueEditor from "../editor";
import { CataloguePdfButton } from "../../doc-pdf-button";
import DeleteDocument from "../../delete-document";

export default async function CatalogueItemPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;

  const [data, settings] = await Promise.all([
    getCatalogueItem(Number(id)).catch(() => null),
    getDocSettings().catch(() => null),
  ]);
  if (!data?.item) notFound();
  const item = data.item;
  const admin = isAdminRole(me.role);

  return (
    <>
      <div className="head">
        <h1>
          {item.name}
          <span className={`pill ${item.active ? "s-accepted" : "s-draft"}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>
            {item.active ? "Listed" : "Retired"}
          </span>
        </h1>
        <div className="spacer" />
        <CataloguePdfButton
          items={[item]}
          settings={settings?.settings ?? null}
          label="Download this sheet"
        />
        <Link href="/catalogue" className="btn ghost">
          The catalogue
        </Link>
      </div>

      <div className="qt-page">
        <div className="qt-page__main">
          <CatalogueEditor item={item} canEdit={admin} />
        </div>

        <aside className="qt-page__side">
          {item.image_url && (
            <div className="card">
              <h2>The picture</h2>
              {/* The URL is entered by an admin and can point anywhere, so it is
                  loaded as a plain image rather than through an optimiser. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.name}
                style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)", display: "block" }}
              />
            </div>
          )}

          <div className="card">
            <h2>At a glance</h2>
            <dl className="qt-summary">
              <div>
                <dt>Model</dt>
                <dd>{item.model || "—"}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{item.category || "—"}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{money(item.price, item.currency)}</dd>
              </div>
              <div>
                <dt>On the sheet</dt>
                <dd>{item.active ? "Listed" : "Retired"}</dd>
              </div>
              <div>
                <dt>Order</dt>
                <dd>{item.position}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{item.created_at?.slice(0, 10)}</dd>
              </div>
            </dl>
          </div>

          {admin && (
            <div className="card">
              <h2>Danger</h2>
              <DeleteDocument
                kind="catalogue"
                id={item.id}
                what={item.name}
                redirectTo="/catalogue"
                label="Remove this machine"
              />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

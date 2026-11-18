import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getDocSettings, listCatalogue } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import CataloguePicker from "./picker";

/**
 * The machines the business sells, as one sheet the team can send.
 *
 * Drafted here and downloaded as a PDF in the same design as the quotation,
 * so a customer asking "what do you have?" gets the catalogue rather than
 * three separate quotations.
 */
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; active?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const active = sp.active === "1" ? true : sp.active === "0" ? false : undefined;

  const [data, settings] = await Promise.all([
    listCatalogue({ q: sp.q, category: sp.category, active }).catch(() => null),
    getDocSettings().catch(() => null),
  ]);
  const canWrite = isAdminRole(me.role);

  const tab = (key: string, label: string) => {
    const params = new URLSearchParams();
    if (key) params.set("active", key);
    if (sp.q) params.set("q", sp.q);
    if (sp.category) params.set("category", sp.category);
    const href = `/catalogue${params.toString() ? `?${params}` : ""}`;
    return (
      <Link key={key || "all"} href={href} className={`seg__btn${(sp.active ?? "") === key ? " is-on" : ""}`}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <div className="head">
        <h1>Catalogue</h1>
        <div className="spacer" />
        {canWrite && (
          <Link href="/catalogue/new" className="btn">
            + Add a machine
          </Link>
        )}
      </div>

      {!data ? (
        <div className="msg err">
          Could not load the catalogue. The plugin needs to be version 1.38 or newer.
        </div>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 14 }}>
            {tab("", "All")}
            {tab("1", "Listed")}
            {tab("0", "Retired")}
          </div>

          <form className="row" style={{ gap: 8, marginBottom: 14 }}>
            {sp.active && <input type="hidden" name="active" value={sp.active} />}
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search a machine or model"
              style={{ flex: 1, maxWidth: 340 }}
            />
            {data.categories.length > 0 && (
              <select name="category" defaultValue={sp.category ?? ""} style={{ maxWidth: 200 }}>
                <option value="">Every category</option>
                {data.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
            <button className="btn ghost sm">Search</button>
          </form>

          {data.items.length === 0 ? (
            <p className="empty" style={{ padding: 28 }}>
              {sp.q || sp.category || sp.active
                ? "No machine matches that."
                : "The catalogue is empty. Add the first machine above."}
            </p>
          ) : (
            <CataloguePicker items={data.items} settings={settings?.settings ?? null} />
          )}
        </>
      )}
    </>
  );
}

import { requireBlogger } from "@/lib/auth";
import { listBlogCategories } from "@/lib/queries";
import { isAdminRole } from "@/lib/types";
import CategoryManager from "./manager";

export default async function BlogCategoriesPage() {
  const me = await requireBlogger();
  let data;
  try {
    data = await listBlogCategories(me);
  } catch {
    return <div className="msg err">Could not load categories. The WordPress plugin needs to be version 1.24.0 or newer.</div>;
  }
  return (
    <>
      <div className="head">
        <h1>Blog categories</h1>
      </div>
      <p className="board-hint">
        The categories on brandsquare.shop, read straight from WordPress. Add one here and it is
        available to tick on any post straight away.
      </p>
      <CategoryManager categories={data.categories} defaultId={data.default_id} canDelete={isAdminRole(me.role)} />
    </>
  );
}

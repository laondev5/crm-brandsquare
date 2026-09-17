import { requireBlogger } from "@/lib/auth";
import { getBlogMeta, listBlogCategories } from "@/lib/queries";
import PostEditor from "../editor";

export default async function NewPostPage() {
  const me = await requireBlogger();
  let cats;
  let meta;
  try {
    [cats, meta] = await Promise.all([listBlogCategories(me), getBlogMeta(me)]);
  } catch {
    return <div className="msg err">Could not reach the blog. The WordPress plugin needs to be version 1.24.0 or newer.</div>;
  }
  return (
    <PostEditor
      post={null}
      categories={cats.categories}
      usedKeywords={meta.used_keywords}
      siteUrl={meta.site_url}
      canDeleteCategories={false}
    />
  );
}

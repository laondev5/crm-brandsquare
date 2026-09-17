import { notFound } from "next/navigation";
import { requireBlogger } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getBlogMeta, getBlogPost, listBlogCategories } from "@/lib/queries";
import PostEditor from "../editor";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const me = await requireBlogger();
  const { id } = await params;
  const { saved } = await searchParams;

  let post;
  let cats;
  let meta;
  try {
    [{ post }, cats, meta] = await Promise.all([
      getBlogPost(me, Number(id)),
      listBlogCategories(me),
      getBlogMeta(me),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return <div className="msg err">Could not load that post. The WordPress plugin needs to be version 1.24.0 or newer.</div>;
  }

  return (
    <PostEditor
      post={post}
      categories={cats.categories}
      usedKeywords={post.used_keywords ?? meta.used_keywords}
      siteUrl={meta.site_url}
      canDeleteCategories={false}
      justSaved={saved}
    />
  );
}

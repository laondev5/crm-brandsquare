"use server";

import { revalidatePath } from "next/cache";
import { requireBlogger } from "@/lib/auth";
import {
  deleteBlogCategory,
  saveBlogCategory,
  saveBlogPost,
  trashBlogPost,
  uploadBlogImage,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { isAdminRole, type BlogCategory, type BlogPost, type BlogPostInput } from "@/lib/types";

type Fail = { error: string };
const fail = (e: unknown, fallback: string): Fail => ({
  error: e instanceof ApiError ? e.message : fallback,
});

export async function saveBlogPostAction(
  id: number | null,
  input: BlogPostInput
): Promise<{ post: BlogPost } | Fail> {
  const me = await requireBlogger();
  if (!input.title.trim()) return { error: "Give the post a title." };
  if (input.status === "future" && !input.date) return { error: "Pick a date and time to schedule it for." };
  try {
    const res = await saveBlogPost(me, id, input);
    revalidatePath("/blog");
    revalidatePath("/blog/analytics");
    if (res.post?.id) revalidatePath(`/blog/${res.post.id}`);
    return { post: res.post };
  } catch (e) {
    return fail(e, "Could not save the post.");
  }
}

export async function trashBlogPostAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireBlogger();
  try {
    await trashBlogPost(me, id);
    revalidatePath("/blog");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not move the post to the bin.");
  }
}

const MAX_IMAGE = 8 * 1024 * 1024;

export async function uploadBlogImageAction(form: FormData): Promise<{ id: number; url: string } | Fail> {
  const me = await requireBlogger();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return { error: "Images must be JPG, PNG, WebP or GIF." };
  if (file.size > MAX_IMAGE) {
    return { error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 8 MB.` };
  }
  try {
    return await uploadBlogImage(me, file, String(form.get("alt") ?? ""));
  } catch (e) {
    return fail(e, "Could not upload that image.");
  }
}

export async function saveBlogCategoryAction(
  id: number | null,
  input: { name: string; slug?: string; description?: string; parent?: number }
): Promise<{ category: BlogCategory } | Fail> {
  const me = await requireBlogger();
  if (!input.name.trim()) return { error: "Give the category a name." };
  try {
    const res = await saveBlogCategory(me, id, input);
    revalidatePath("/blog/categories");
    return { category: res.category };
  } catch (e) {
    return fail(e, "Could not save the category.");
  }
}

export async function deleteBlogCategoryAction(id: number): Promise<{ ok: true } | Fail> {
  const me = await requireBlogger();
  if (!isAdminRole(me.role)) return { error: "Only an admin can delete a category." };
  try {
    await deleteBlogCategory(me, id);
    revalidatePath("/blog/categories");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete the category.");
  }
}

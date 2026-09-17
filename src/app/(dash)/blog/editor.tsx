"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import {
  saveBlogCategoryAction,
  saveBlogPostAction,
  trashBlogPostAction,
  uploadBlogImageAction,
} from "@/app/actions/blog";
import { analyzeSeo } from "@/lib/seo";
import type { BlogCategory, BlogPost, BlogPostInput } from "@/lib/types";
import RichText from "./rich-text";
import SeoPanel from "./seo-panel";
import { StatusChip } from "./bits";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** "2026-09-20 09:00:00" → "2026-09-20T09:00" for a datetime-local input. */
const toLocalInput = (d: string) => (d ? d.replace(" ", "T").slice(0, 16) : "");

/**
 * Writing a post, start to finish: the title and body on the left, and down
 * the right the same boxes WordPress has — publish, categories, tags, featured
 * image, excerpt — plus Rank Math's SEO box scoring the post as it is written.
 */
export default function PostEditor({
  post,
  categories: initialCats,
  usedKeywords,
  siteUrl,
  justSaved,
}: {
  /** Set after the first save of a new post, which moves to its own page. */
  justSaved?: string;
  post: BlogPost | null;
  categories: BlogCategory[];
  usedKeywords: string[];
  siteUrl: string;
  canDeleteCategories: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(
    justSaved === "publish"
      ? "Published. It is live on the website."
      : justSaved === "future"
        ? "Scheduled. It will go live on its own."
        : justSaved
          ? "Draft saved."
          : ""
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post?.slug);
  const [catIds, setCatIds] = useState<number[]>(post?.category_ids ?? []);
  const [cats, setCats] = useState(initialCats);
  const [newCat, setNewCat] = useState("");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [featured, setFeatured] = useState({ id: post?.featured_id ?? 0, url: post?.featured_url ?? "" });
  const [uploadingFeat, setUploadingFeat] = useState(false);
  const [keyword, setKeyword] = useState(post?.focus_keyword ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [description, setDescription] = useState(post?.meta_description ?? "");
  const [schedule, setSchedule] = useState(post?.status === "future" ? toLocalInput(post.date) : "");
  const [showSchedule, setShowSchedule] = useState(post?.status === "future");
  const featRef = useRef<HTMLInputElement>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);

  // The analysis reads the post with the browser's HTML parser, which the
  // server does not have — scoring during the server render gave a different
  // word count and score from the browser's, and React threw the page away.
  // So the first render scores nothing, and the real score follows at once.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const seo = useMemo(
    () =>
      analyzeSeo({
        title,
        seoTitle,
        description,
        slug: effectiveSlug,
        html: mounted ? content : "",
        keyword: mounted ? keyword : "",
        siteUrl,
        usedKeywords,
      }),
    [mounted, title, seoTitle, description, effectiveSlug, content, keyword, siteUrl, usedKeywords]
  );

  const upload = async (file: File, alt: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", alt);
    return uploadBlogImageAction(fd);
  };

  const save = (status: BlogPostInput["status"]) => {
    setErr("");
    setOk("");
    const input: BlogPostInput = {
      title,
      content,
      excerpt,
      slug: effectiveSlug,
      status,
      date: status === "future" ? schedule : status === "draft" ? "" : post?.status === "publish" ? toLocalInput(post.date) : "",
      category_ids: catIds,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      featured_id: featured.id,
      focus_keyword: keyword.trim(),
      seo_title: seoTitle.trim(),
      meta_description: description.trim(),
      seo_score: seo.score,
    };
    start(async () => {
      const res = await saveBlogPostAction(post?.id ?? null, input);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setOk(
        res.post.status === "publish"
          ? "Published. It is live on the website."
          : res.post.status === "future"
            ? "Scheduled. It will go live on its own."
            : res.post.status === "pending"
              ? "Sent for review."
              : "Draft saved."
      );
      if (!post) router.replace(`/blog/${res.post.id}?saved=${res.post.status}`);
      else router.refresh();
    });
  };

  const trash = () => {
    if (!post || !confirm("Move this post to the bin? It comes off the website, and can be restored in WordPress.")) return;
    start(async () => {
      const res = await trashBlogPostAction(post.id);
      if ("error" in res) setErr(res.error);
      else router.push("/blog");
    });
  };

  const addCategory = () => {
    if (!newCat.trim()) return;
    start(async () => {
      const res = await saveBlogCategoryAction(null, { name: newCat.trim() });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setCats([...cats, res.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCatIds([...catIds, res.category.id]);
      setNewCat("");
    });
  };

  const pickFeatured = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    setUploadingFeat(true);
    const res = await upload(file, title);
    setUploadingFeat(false);
    if (featRef.current) featRef.current.value = "";
    if ("error" in res) setErr(res.error);
    else setFeatured({ id: res.id, url: res.url });
  };

  const live = post?.status === "publish";

  return (
    <>
      <div className="head">
        <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {post ? "Edit post" : "New post"}
          {post && <StatusChip status={post.status} />}
        </h1>
        <div className="spacer" />
        {post?.link && (
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="btn ghost">
            View on site ↗
          </a>
        )}
        {live && (
          <Link href={`/blog/${post!.id}/analytics`} className="btn ghost">
            Analytics
          </Link>
        )}
        <Link href="/blog" className="btn ghost">
          All posts
        </Link>
      </div>

      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}
      {ok && <div className="msg ok">{ok}</div>}

      <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 1fr) 360px" }}>
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title"
            aria-label="Post title"
            style={{ fontSize: 24, fontWeight: 700, padding: "12px 14px", height: "auto" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)", flexWrap: "wrap" }}>
            <span>{siteUrl.replace(/\/$/, "")}/</span>
            <input
              type="text"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value) || e.target.value.toLowerCase());
              }}
              aria-label="URL slug"
              style={{ width: 320, fontSize: 12.5, padding: "4px 8px" }}
            />
            <span>/</span>
          </div>

          <RichText value={content} onChange={setContent} upload={upload} />
          <small style={{ color: "var(--muted)" }}>
            {seo.words.toLocaleString()} words
          </small>

          <div className="card">
            <h2>Excerpt</h2>
            <textarea
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A short summary shown on the blog page and in social previews. Optional."
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, alignSelf: "start" }}>
          <div className="card">
            <h2>Publish</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => save("draft")} style={{ justifyContent: "center" }}>
                {busy ? "Saving…" : live ? "Switch to draft" : "Save draft"}
              </button>
              {!showSchedule ? (
                <button type="button" className="btn" disabled={busy} onClick={() => save("publish")} style={{ justifyContent: "center" }}>
                  {live ? "Update" : "Publish now"}
                </button>
              ) : (
                <>
                  <label className="f" style={{ margin: 0 }}>
                    <span>Publish on (Nigeria time)</span>
                    <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                  </label>
                  <button type="button" className="btn" disabled={busy || !schedule} onClick={() => save("future")} style={{ justifyContent: "center" }}>
                    Schedule
                  </button>
                </>
              )}
              {!live && (
                <button type="button" className="btn ghost sm" onClick={() => setShowSchedule(!showSchedule)}>
                  {showSchedule ? "Publish now instead" : "Schedule for later"}
                </button>
              )}
              {post && (
                <button type="button" className="btn danger sm" disabled={busy} onClick={trash}>
                  Move to bin
                </button>
              )}
            </div>
            {post && (
              <small style={{ display: "block", color: "var(--muted)", marginTop: 10 }}>
                By {post.author_name || "—"}
              </small>
            )}
          </div>

          <SeoPanel
            keyword={keyword}
            setKeyword={setKeyword}
            seoTitle={seoTitle}
            setSeoTitle={setSeoTitle}
            description={description}
            setDescription={setDescription}
            title={title}
            slug={effectiveSlug}
            siteUrl={siteUrl}
            excerpt={excerpt}
            result={seo}
          />

          <div className="card">
            <h2>Categories</h2>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "grid", gap: 6 }}>
              {cats.map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={catIds.includes(c.id)}
                    onChange={(e) => setCatIds(e.target.checked ? [...catIds, c.id] : catIds.filter((x) => x !== c.id))}
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              <input
                type="text"
                value={newCat}
                placeholder="New category"
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn ghost sm" disabled={busy || !newCat.trim()} onClick={addCategory}>
                Add
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Tags</h2>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="oil press, farming, Nigeria" style={{ width: "100%" }} />
            <small style={{ color: "var(--muted)" }}>Separate with commas.</small>
          </div>

          <div className="card">
            <h2>Featured image</h2>
            <input ref={featRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => pickFeatured(e.target.files?.[0])} />
            {featured.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- a WordPress media URL */}
                <img src={featured.url} alt="" style={{ width: "100%", borderRadius: 8, display: "block" }} />
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                  <button type="button" className="btn ghost sm" onClick={() => featRef.current?.click()} disabled={uploadingFeat}>
                    Replace
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => setFeatured({ id: 0, url: "" })}>
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => featRef.current?.click()}
                disabled={uploadingFeat}
                style={{ width: "100%", border: "1.5px dashed var(--line)", borderRadius: 8, padding: "22px 10px", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--txt)" }}
              >
                <ImagePlus className="size-4" />
                {uploadingFeat ? "Uploading…" : "Set featured image"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

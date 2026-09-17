"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBlogCategoryAction, saveBlogCategoryAction } from "@/app/actions/blog";
import type { BlogCategory } from "@/lib/types";

export default function CategoryManager({
  categories,
  defaultId,
  canDelete,
}: {
  categories: BlogCategory[];
  defaultId: number;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", parent: 0 });

  const nameOf = (id: number) => categories.find((c) => c.id === id)?.name ?? "";

  const load = (c: BlogCategory | null) => {
    setErr("");
    setEditing(c ? c.id : null);
    setForm(c ? { name: c.name, slug: c.slug, description: c.description, parent: c.parent } : { name: "", slug: "", description: "", parent: 0 });
  };

  const save = () => {
    setErr("");
    start(async () => {
      const res = await saveBlogCategoryAction(editing, form);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      load(null);
      router.refresh();
    });
  };

  const remove = (c: BlogCategory) => {
    if (!confirm(`Delete “${c.name}”? Its ${c.count} post${c.count === 1 ? "" : "s"} keep their other categories, or move to the default one.`)) return;
    setErr("");
    start(async () => {
      const res = await deleteBlogCategoryAction(c.id);
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="grid2">
      <div className="card" style={{ padding: "6px 8px" }}>
        {err && <div className="msg err" style={{ margin: 8 }}>{err}</div>}
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ width: 160 }}>Slug</th>
              <th style={{ width: 70 }}>Posts</th>
              <th style={{ width: 150 }} />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td data-l="Name">
                  <strong style={{ color: "var(--ink)" }}>{c.name}</strong>
                  {c.parent > 0 && <small style={{ color: "var(--muted)" }}> — under {nameOf(c.parent)}</small>}
                  {c.id === defaultId && <small style={{ color: "var(--muted)" }}> (default)</small>}
                  {c.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.description}</div>}
                </td>
                <td data-l="Slug" style={{ fontSize: 12.5, color: "var(--muted)" }}>{c.slug}</td>
                <td data-l="Posts">{c.count}</td>
                <td data-l="">
                  <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn ghost sm" disabled={busy} onClick={() => load(c)}>
                      Edit
                    </button>
                    {canDelete && c.id !== defaultId && (
                      <button className="btn danger sm" disabled={busy} onClick={() => remove(c)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ alignSelf: "start" }}>
        <h2>{editing ? "Edit category" : "Add a category"}</h2>
        <label className="f">
          <span>Name</span>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Farm machinery" />
        </label>
        <label className="f">
          <span>Slug (optional)</span>
          <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="farm-machinery" />
        </label>
        <label className="f">
          <span>Parent</span>
          <select value={form.parent} onChange={(e) => setForm({ ...form, parent: Number(e.target.value) })}>
            <option value={0}>None</option>
            {categories.filter((c) => c.id !== editing).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Description (optional)</span>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" disabled={busy || !form.name.trim()} onClick={save}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add category"}
          </button>
          {editing && (
            <button className="btn ghost" onClick={() => load(null)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

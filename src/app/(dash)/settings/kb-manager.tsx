"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { deleteKbAction, moveKbAction, saveKbAction } from "@/app/actions/kb";
import { groupBySection, type KbItem, type KbKind } from "@/lib/types";

const NEW_SECTION = "__new__";

/**
 * Adding, rewording, reordering and removing response templates or FAQs. The
 * list on the left mirrors the page the team reads; the form on the right is
 * where one entry is written.
 */
export default function KbManager({ kind, items }: { kind: KbKind; items: KbItem[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [editing, setEditing] = useState<KbItem | null>(null);
  const groups = groupBySection(items);
  const sections = groups.map((g) => g.section);
  const [section, setSection] = useState(sections[0] ?? NEW_SECTION);
  const [newSection, setNewSection] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const isFaq = kind === "faq";
  const noun = isFaq ? "question" : "template";

  const load = (it: KbItem | null) => {
    setErr("");
    setOk("");
    setEditing(it);
    setSection(it ? it.section : sections[0] ?? NEW_SECTION);
    setNewSection("");
    setTitle(it?.title ?? "");
    setBody(it?.body ?? "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const save = () => {
    setErr("");
    setOk("");
    const sec = section === NEW_SECTION ? newSection : section;
    start(async () => {
      const res = await saveKbAction({ id: editing?.id, kind, section: sec, title, body });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setOk(editing ? "Saved." : `Added. It is on the ${isFaq ? "FAQ" : "Response templates"} page now.`);
      if (!editing) {
        setTitle("");
        setBody("");
        if (section === NEW_SECTION) setSection(sec);
      }
      router.refresh();
    });
  };

  const remove = (it: KbItem) => {
    if (!confirm(`Delete “${it.title}”?`)) return;
    start(async () => {
      const res = await deleteKbAction(kind, it.id);
      if ("error" in res) setErr(res.error);
      else {
        if (editing?.id === it.id) load(null);
        router.refresh();
      }
    });
  };

  const move = (list: KbItem[], i: number, dir: -1 | 1) => {
    const a = list[i];
    const b = list[i + dir];
    if (!a || !b) return;
    start(async () => {
      const res = await moveKbAction(kind, { id: a.id, sort_order: a.sort_order }, { id: b.id, sort_order: b.sort_order });
      if ("error" in res) setErr(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        {groups.length === 0 && (
          <div className="card">
            <p className="empty">Nothing yet. Add the first {noun} on the right.</p>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.section} className="card">
            <h2>
              {g.section} <small style={{ color: "var(--muted)", fontWeight: 400 }}>({g.items.length})</small>
            </h2>
            <div style={{ display: "grid", gap: 6 }}>
              {g.items.map((it, i) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: editing?.id === it.id ? "var(--accent)" : "#fff",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13.5, color: "var(--ink)" }}>{it.title}</strong>
                    <small style={{ display: "block", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.body.replace(/\s+/g, " ")}
                    </small>
                  </div>
                  <button className="btn ghost sm" style={{ padding: 6 }} aria-label="Move up" disabled={busy || i === 0} onClick={() => move(g.items, i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button className="btn ghost sm" style={{ padding: 6 }} aria-label="Move down" disabled={busy || i === g.items.length - 1} onClick={() => move(g.items, i, 1)}>
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button className="btn ghost sm" disabled={busy} onClick={() => load(it)}>
                    Edit
                  </button>
                  <button className="btn danger sm" disabled={busy} onClick={() => remove(it)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div ref={formRef} className="card" style={{ alignSelf: "start", position: "sticky", top: 16, scrollMarginTop: 16 }}>
        <div className="row" style={{ alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{editing ? `Edit ${noun}` : `Add a ${noun}`}</h2>
          <div className="spacer" />
          {editing && (
            <button className="btn ghost sm" onClick={() => load(null)}>
              Add a new one instead
            </button>
          )}
        </div>

        {err && <div className="msg err">{err}</div>}
        {ok && <div className="msg ok">{ok}</div>}

        <label className="f">
          <span>Section</span>
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={NEW_SECTION}>+ New section…</option>
          </select>
        </label>
        {section === NEW_SECTION && (
          <label className="f">
            <span>New section name</span>
            <input type="text" value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="e.g. Spare parts" />
          </label>
        )}

        <label className="f">
          <span>{isFaq ? "Question" : "Title — when to use it"}</span>
          <input
            type="text"
            value={title}
            maxLength={190}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isFaq ? "Do you deliver to Port Harcourt?" : "Reply when a customer asks for a video"}
          />
        </label>

        <label className="f">
          <span>{isFaq ? "Answer" : "Message"}</span>
          <textarea
            rows={isFaq ? 6 : 12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isFaq ? "The recommended answer…" : "Dear [Name],\n\nThank you for your interest in the [Machine Name]…\n\nBest regards,\n[Your Name]"}
          />
        </label>
        {!isFaq && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4 }}>
            Write <code>[Name]</code>, <code>[Machine Name]</code> and <code>[Your Name]</code> exactly like that and
            they fill in for whoever uses the template. Any other <code>[blank]</code> is highlighted so
            nobody sends it unfilled.
          </p>
        )}

        <button className="btn" disabled={busy} onClick={save} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Saving…" : editing ? "Save changes" : `Add ${noun}`}
        </button>
      </div>
    </div>
  );
}

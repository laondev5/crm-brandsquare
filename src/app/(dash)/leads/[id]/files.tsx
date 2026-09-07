"use client";

import { useRef, useState, useTransition } from "react";
import { deleteFileAction, uploadFileAction } from "@/app/actions/files";
import { humanSize, type LeadFile } from "@/lib/types";

/**
 * Documents that belong to a lead — a quote, a spec sheet, a signed order.
 *
 * The list is held in state and replaced with whatever the server returns
 * after each change, rather than being re-derived from a page refresh. The
 * server is the one that knows what is really attached, and a file that
 * failed to save should not linger on screen looking as though it did.
 */
export default function Files({ leadId, initial }: { leadId: number; initial: LeadFile[] }) {
  const [files, setFiles] = useState<LeadFile[]>(initial);
  const [err, setErr] = useState("");
  const [busy, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const send = (file: File) => {
    setErr("");
    const form = new FormData();
    form.append("file", file, file.name);

    startTransition(async () => {
      const res = await uploadFileAction(leadId, form);
      if ("error" in res) setErr(res.error);
      else setFiles(res.files);
      // Clearing the picker matters: without it, choosing the same file again
      // fires no change event and the second upload silently never happens.
      if (input.current) input.current.value = "";
    });
  };

  const remove = (f: LeadFile) => {
    if (!confirm(`Remove ${f.name}? This deletes the file itself, not just the link to it.`)) return;
    setErr("");
    startTransition(async () => {
      const res = await deleteFileAction(leadId, f.id);
      if ("error" in res) setErr(res.error);
      else setFiles(res.files);
    });
  };

  return (
    <div className="card">
      <h2>Files</h2>

      {err && <div className="msg err">{err}</div>}

      {files.length === 0 ? (
        <p className="empty" style={{ padding: "10px 0" }}>
          Nothing attached yet.
        </p>
      ) : (
        <ul className="filelist">
          {files.map((f) => (
            <li key={f.id}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="name">
                {f.name}
              </a>
              <small>
                {humanSize(f.size_bytes)}
                {f.uploaded_by_name ? ` · ${f.uploaded_by_name}` : ""} · {fmt(f.created_at)}
              </small>
              <button
                className="btn ghost sm"
                disabled={busy}
                onClick={() => remove(f)}
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="btn ghost sm" style={{ marginTop: 10, display: "inline-flex" }}>
        {busy ? "Working…" : "Attach a file"}
        <input
          ref={input}
          type="file"
          hidden
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) send(f);
          }}
        />
      </label>
    </div>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

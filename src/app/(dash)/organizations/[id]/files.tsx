"use client";

import { useRef, useState, useTransition } from "react";
import { deleteOrgFileAction, uploadOrgFileAction } from "@/app/actions/files";
import { humanSize, type LeadFile } from "@/lib/types";

/**
 * Documents that belong to a company — a signed agreement, a KYC pack, a
 * price list agreed on paper.
 *
 * The list is whatever the server returned after the last change, not what
 * the browser hopes is attached, so a file that failed to save never sits on
 * screen looking as though it did.
 */
export default function OrgFiles({
  orgId,
  initial,
  canWrite,
}: {
  orgId: number;
  initial: LeadFile[];
  canWrite: boolean;
}) {
  const [files, setFiles] = useState<LeadFile[]>(initial);
  const [err, setErr] = useState("");
  const [busy, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const send = (file: File) => {
    setErr("");
    const form = new FormData();
    form.append("file", file, file.name);

    startTransition(async () => {
      const res = await uploadOrgFileAction(orgId, form);
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
      const res = await deleteOrgFileAction(orgId, f.id);
      if ("error" in res) setErr(res.error);
      else setFiles(res.files);
    });
  };

  return (
    <div className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>Company files</h2>
        <div style={{ flex: 1 }} />
        <small style={{ color: "var(--muted)" }}>
          {files.length} {files.length === 1 ? "file" : "files"}
        </small>
      </div>
      <p style={{ margin: "6px 0 12px", fontSize: 12.5, color: "var(--muted)" }}>
        Agreements, KYC documents, anything that belongs to the company rather than to one sale.
      </p>

      {err && <div className="msg err">{err}</div>}

      {files.length === 0 ? (
        <p className="empty" style={{ padding: "6px 0 14px", margin: 0 }}>
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
              {canWrite && (
                <button
                  className="btn ghost sm"
                  disabled={busy}
                  onClick={() => remove(f)}
                  aria-label={`Remove ${f.name}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <label className="btn ghost sm" style={{ marginTop: 12, display: "inline-flex" }}>
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
      )}
    </div>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

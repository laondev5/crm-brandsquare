"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { importLeadsAction } from "../../../actions/leads";
import type { BulkImportResult, BulkLeadRow, Campaign } from "@/lib/types";

type ColumnRole = "skip" | "name" | "email" | "phone" | "field";

interface ParsedFile {
  headers: string[];
  rows: string[][];
}

const MAX_ROWS = 5000;

export default function Importer({
  campaigns,
  isAdmin,
}: {
  campaigns: Campaign[];
  isAdmin: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [campaignChoice, setCampaignChoice] = useState<"none" | "existing" | "new">("new");
  const [campaignId, setCampaignId] = useState<number | "">("");
  const [campaignName, setCampaignName] = useState("");
  const [assignMode, setAssignMode] = useState<"auto" | "unassigned">("auto");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guessRole(header: string): ColumnRole {
    const h = header.trim().toLowerCase();
    if (/^(full ?name|name)$/.test(h)) return "name";
    if (/e-?mail/.test(h)) return "email";
    if (/phone|mobile|tel/.test(h)) return "phone";
    return "field";
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setResult(null);
    setFileName(file.name);
    setCampaignName(file.name.replace(/\.(csv|xlsx?|xls)$/i, ""));

    try {
      // Loaded on demand — this page is the only one that needs a parsing
      // library, so nobody pays for it until they actually open Import.
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });

      if (!grid.length) {
        setParseError("That file has no rows.");
        return;
      }

      const headers = (grid[0] as string[]).map((h) => String(h ?? "").trim());
      const rows = (grid.slice(1) as string[][]).filter((r) =>
        r.some((c) => String(c ?? "").trim() !== "")
      );

      if (!rows.length) {
        setParseError("Found headers but no data rows underneath them.");
        return;
      }
      if (rows.length > MAX_ROWS) {
        setParseError(
          `That file has ${rows.length} rows — the limit is ${MAX_ROWS}. Split it and import in parts.`
        );
        return;
      }

      setParsed({ headers, rows });
      setRoles(headers.map(guessRole));
    } catch {
      setParseError("Could not read that file. Make sure it's a .csv, .xls or .xlsx file.");
    }
  }

  function buildRows(): BulkLeadRow[] {
    if (!parsed) return [];
    const { headers, rows } = parsed;

    return rows.map((cells) => {
      const row: BulkLeadRow = { answers: [] };
      headers.forEach((h, i) => {
        const role = roles[i];
        const value = String(cells[i] ?? "").trim();
        if (!value || role === "skip") return;
        if (role === "name") row.name = value;
        else if (role === "email") row.email = value;
        else if (role === "phone") row.phone = value;
        else row.answers!.push({ label: h || `Column ${i + 1}`, value });
      });
      return row;
    });
  }

  function submit() {
    if (!parsed) return;
    setError(null);
    setBusy(true);

    const input = {
      rows: buildRows(),
      formId: campaignChoice === "existing" ? (Number(campaignId) || null) : null,
      formName: campaignChoice === "new" ? campaignName.trim() : "",
      selfAssign: !isAdmin,
      unassigned: isAdmin && assignMode === "unassigned",
    };

    startTransition(async () => {
      const res = await importLeadsAction(input);
      setBusy(false);
      if (res.error) setError(res.error);
      else if (res.result) setResult(res.result);
    });
  }

  if (result) {
    return (
      <>
        <div className="head">
          <h1>Import finished</h1>
        </div>
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="msg ok">
            {result.created} lead{result.created === 1 ? "" : "s"} added
            {result.campaign_name ? ` to “${result.campaign_name}”` : ""}.
          </div>
          {result.skipped.length > 0 && (
            <div className="msg err">
              {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} skipped
              (usually a blank line at the end of the file).
            </div>
          )}
          <div className="row">
            {result.campaign_id && (
              <Link href={`/campaigns/${result.campaign_id}`} className="btn">
                View campaign
              </Link>
            )}
            <Link href="/leads" className="btn ghost">
              Go to leads
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="head">
        <h1>Import leads</h1>
        <div className="spacer" />
        <Link href="/leads" className="btn ghost">
          Cancel
        </Link>
      </div>

      {error && <div className="msg err">{error}</div>}
      {parseError && <div className="msg err">{parseError}</div>}

      {!parsed ? (
        <div className="card" style={{ maxWidth: 560 }}>
          <h2>Choose a file</h2>
          <p style={{ marginTop: 0 }}>CSV or Excel (.xlsx, .xls). The first row must be column headers.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFile}
          />
        </div>
      ) : (
        <div className="grid2">
          <div style={{ display: "grid", gap: 20 }}>
            <div className="card">
              <h2>{fileName}</h2>
              <p style={{ marginTop: 0, fontSize: 13, color: "var(--muted)" }}>
                {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} found. Tell us what
                each column is — anything not mapped to name, email or phone is kept as a field
                on the lead.
              </p>

              <table className="tbl" style={{ marginTop: 4 }}>
                <thead>
                  <tr>
                    <th>Column</th>
                    <th style={{ width: 180 }}>Maps to</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.headers.map((h, i) => (
                    <tr key={i}>
                      <td data-l="Column">
                        <strong style={{ color: "var(--ink)" }}>{h || `Column ${i + 1}`}</strong>
                      </td>
                      <td data-l="Maps to">
                        <select
                          value={roles[i]}
                          onChange={(e) => {
                            const next = [...roles];
                            next[i] = e.target.value as ColumnRole;
                            setRoles(next);
                          }}
                        >
                          <option value="field">Keep as a field</option>
                          <option value="name">Full name</option>
                          <option value="email">Email address</option>
                          <option value="phone">Phone number</option>
                          <option value="skip">Don&rsquo;t import</option>
                        </select>
                      </td>
                      <td data-l="Example" style={{ color: "var(--muted)" }}>
                        {String(parsed.rows[0]?.[i] ?? "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                className="btn ghost"
                style={{ marginTop: 14 }}
                onClick={() => {
                  setParsed(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Choose a different file
              </button>
            </div>

            <div className="card">
              <h2>Preview</h2>
              <table className="tbl">
                <thead>
                  <tr>
                    {parsed.headers.map((h, i) => (
                      <th key={i}>
                        {roleLabel(roles[i])}
                        <br />
                        <small style={{ fontWeight: 400, color: "var(--muted)" }}>{h}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      {parsed!.headers.map((_, j) => (
                        <td key={j}>{r[j]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>
                  …and {parsed.rows.length - 5} more.
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div className="card">
              <h2>Group as</h2>
              <label className="chooser">
                <input
                  type="radio"
                  checked={campaignChoice === "new"}
                  onChange={() => setCampaignChoice("new")}
                />
                <span>
                  <strong>New source</strong>
                  <small>All these leads are tagged together</small>
                </span>
              </label>
              {campaignChoice === "new" && (
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Name this source"
                  style={{ marginBottom: 8 }}
                />
              )}

              <label className="chooser">
                <input
                  type="radio"
                  checked={campaignChoice === "existing"}
                  onChange={() => setCampaignChoice("existing")}
                />
                <span>
                  <strong>Add to an existing campaign</strong>
                </span>
              </label>
              {campaignChoice === "existing" && (
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(Number(e.target.value) || "")}
                  style={{ marginBottom: 8 }}
                >
                  <option value="">Choose…</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              <label className="chooser">
                <input
                  type="radio"
                  checked={campaignChoice === "none"}
                  onChange={() => setCampaignChoice("none")}
                />
                <span>
                  <strong>No campaign</strong>
                </span>
              </label>
            </div>

            {isAdmin ? (
              <div className="card">
                <h2>Assignment</h2>
                <label className="chooser">
                  <input
                    type="radio"
                    checked={assignMode === "auto"}
                    onChange={() => setAssignMode("auto")}
                  />
                  <span>
                    <strong>Spread evenly</strong>
                    <small>Same round-robin rule as leads from the website</small>
                  </span>
                </label>
                <label className="chooser">
                  <input
                    type="radio"
                    checked={assignMode === "unassigned"}
                    onChange={() => setAssignMode("unassigned")}
                  />
                  <span>
                    <strong>Leave unassigned</strong>
                    <small>Assign them yourself afterwards</small>
                  </span>
                </label>
              </div>
            ) : (
              <div className="card">
                <h2>Assignment</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  All {parsed.rows.length} leads will be assigned to you.
                </p>
              </div>
            )}

            <button
              className="btn"
              disabled={busy || pending || (campaignChoice === "new" && !campaignName.trim())}
              onClick={submit}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {busy || pending ? "Importing…" : `Import ${parsed.rows.length} lead${parsed.rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function roleLabel(r: ColumnRole) {
  if (r === "name") return "Name";
  if (r === "email") return "Email";
  if (r === "phone") return "Phone";
  if (r === "skip") return "Skipped";
  return "Field";
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeWaAction } from "@/app/actions/whatsapp";
import type { WaDiagnostics } from "@/lib/types";

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Why messages are, or are not, arriving.
 *
 * Messages need three links to hold: the webhook verified, the messages field
 * subscribed, and the app subscribed to the WhatsApp Business Account. The
 * last is invisible in Meta's dashboard, and when any of them is missing the
 * symptom is the same silence. So this asks Meta about the third and shows
 * what actually reached the webhook, then says in one line which it is.
 */
export default function Diagnostics({ diag }: { diag: WaDiagnostics }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");

  const { subscription: sub, log } = diag;
  const messages = log.filter((l) => l.kind === "message");
  const accepted = messages.find((l) => l.ok && l.detail.startsWith("Accepted"));
  const badSig = messages.find((l) => !l.ok && l.detail.includes("signature did not match"));

  let verdict: { tone: "ok" | "warn" | "err"; text: string };
  if (sub.checked && !sub.error && !sub.subscribed) {
    verdict = {
      tone: "err",
      text: "Your app is not subscribed to this WhatsApp Business Account, so Meta delivers nothing to this site. Press Subscribe below — that is the fix.",
    };
  } else if (badSig && (!accepted || badSig.at > accepted.at)) {
    verdict = {
      tone: "err",
      text: "Meta is calling, but this site is refusing it: the App secret saved on the left is not the one Meta signs with. Copy it again from App settings → Basic and save.",
    };
  } else if (accepted) {
    verdict = { tone: "ok", text: `Messages are arriving — the last one came in ${fmt(accepted.at)}.` };
  } else if (sub.error) {
    verdict = { tone: "warn", text: `Could not ask Meta about the subscription: ${sub.error}` };
  } else {
    verdict = {
      tone: "warn",
      text: "Meta has not delivered a message yet. Check that the webhook's messages field is subscribed, and that the phone you are texting from is on the test number's allowed list.",
    };
  }

  return (
    <div className="card">
      <h2>Why messages are or are not arriving</h2>

      <div className={`msg ${verdict.tone}`} style={{ marginTop: 0 }}>
        {verdict.text}
      </div>

      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      <table className="kv">
        <tbody>
          <tr>
            <th style={{ width: 150 }}>App subscription</th>
            <td>
              {!sub.checked ? (
                <span style={{ color: "var(--muted)" }}>{sub.error || "Not checked"}</span>
              ) : sub.error ? (
                <span style={{ color: "var(--err)" }}>{sub.error}</span>
              ) : sub.subscribed ? (
                <span style={{ color: "var(--ok)" }}>
                  Subscribed: {sub.apps.map((a) => a.name || a.id).join(", ")}
                </span>
              ) : (
                <span style={{ color: "var(--err)", fontWeight: 600 }}>Not subscribed</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="row" style={{ gap: 10, margin: "12px 0 16px" }}>
        {sub.checked && !sub.subscribed && !sub.error && (
          <button
            className="btn"
            disabled={busy}
            onClick={() => {
              setErr("");
              start(async () => {
                const res = await subscribeWaAction();
                if ("error" in res) setErr(res.error);
                router.refresh();
              });
            }}
          >
            {busy ? "Subscribing…" : "Subscribe"}
          </button>
        )}
        <button className="btn ghost" disabled={busy} onClick={() => start(() => router.refresh())}>
          Check again
        </button>
      </div>

      <strong style={{ fontSize: 13 }}>What reached the webhook</strong>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 8px" }}>
        The last 20 calls, newest first — including any test you run yourself. Only the outcome is
        kept, never the message.
      </p>

      {log.length === 0 ? (
        <p className="empty" style={{ padding: "12px 0" }}>
          Nothing has reached this site yet.
        </p>
      ) : (
        <table className="tbl">
          <tbody>
            {log.map((l, i) => (
              <tr key={i}>
                <td data-l="When" style={{ width: 110, whiteSpace: "nowrap" }}>
                  {fmt(l.at)}
                </td>
                <td data-l="Kind" style={{ width: 90 }}>
                  {l.kind === "handshake" ? "Verify" : "Message"}
                </td>
                <td data-l="Result" style={{ color: l.ok ? "var(--ok)" : "var(--err)" }}>
                  {l.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

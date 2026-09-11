import { ExternalLink, Phone, Reply } from "lucide-react";
import { WA_LEAD_FIELDS, type WaHeaderType } from "@/lib/types";

const TOKEN = /(\{\{\s*[a-z][a-z0-9_]{0,30}\s*\}\})/g;

/**
 * A template drawn the way it lands on the customer's phone -- image or
 * header on top, the message, the grey footer, and the buttons underneath as
 * their own tappable strips. Fields show what they will say: the real value
 * when one is known, otherwise a sample, tinted so it reads as a stand-in.
 */
export default function TemplatePreview({
  headerType,
  headerText,
  headerImageUrl,
  body,
  footer,
  buttons,
  values = {},
  examples = {},
  compact = false,
}: {
  headerType: WaHeaderType | string;
  headerText?: string;
  headerImageUrl?: string;
  body: string;
  footer?: string;
  buttons: { type?: string; text: string }[];
  values?: Record<string, string>;
  examples?: Record<string, string>;
  compact?: boolean;
}) {
  const fill = (raw: string) => {
    const key = raw.replace(/[{}\s]/g, "");
    const real = values[key]?.trim();
    const stand =
      examples[key]?.trim() || WA_LEAD_FIELDS.find((f) => f.key === key)?.sample || raw;
    return { text: real || stand, real: !!real };
  };

  return (
    <div
      style={{
        background: "#efeae2",
        borderRadius: 12,
        padding: compact ? 10 : 16,
        minHeight: compact ? 0 : 200,
      }}
    >
      <div style={{ maxWidth: 300 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: buttons.length ? "8px 8px 0 0" : 8,
            padding: 4,
            boxShadow: "0 1px 0.5px rgba(0,0,0,.13)",
          }}
        >
          {headerType === "image" &&
            (headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a WordPress media URL
              <img
                src={headerImageUrl}
                alt=""
                style={{ width: "100%", borderRadius: 6, display: "block", maxHeight: compact ? 120 : 180, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  height: compact ? 70 : 120,
                  borderRadius: 6,
                  background: "#dfe5e7",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  color: "#667781",
                }}
              >
                Image goes here
              </div>
            ))}

          <div style={{ padding: "6px 8px 4px" }}>
            {headerType === "text" && headerText && (
              <strong style={{ display: "block", fontSize: 14, marginBottom: 4, color: "#111b21" }}>
                {headerText}
              </strong>
            )}
            <p
              style={{
                margin: 0,
                fontSize: compact ? 12.5 : 14,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#111b21",
              }}
            >
              {body
                ? body.split(TOKEN).map((part, i) => {
                    if (!TOKEN.test(part)) return part;
                    TOKEN.lastIndex = 0;
                    const f = fill(part);
                    return (
                      <span
                        key={i}
                        style={
                          f.real ? undefined : { background: "#d9fdd3", borderRadius: 3, padding: "0 2px" }
                        }
                      >
                        {f.text}
                      </span>
                    );
                  })
                : <span style={{ color: "#8696a0" }}>Your message will appear here.</span>}
            </p>
            {footer && (
              <small style={{ display: "block", marginTop: 4, fontSize: 12, color: "#667781" }}>{footer}</small>
            )}
          </div>
        </div>

        {buttons.map((b, i) => {
          const Icon = b.type === "url" ? ExternalLink : b.type === "phone" ? Phone : Reply;
          return (
            <div
              key={i}
              style={{
                background: "#fff",
                borderTop: "1px solid #e9edef",
                borderRadius: i === buttons.length - 1 ? "0 0 8px 8px" : 0,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "#00a5f4",
                fontSize: 13.5,
                fontWeight: 500,
                boxShadow: "0 1px 0.5px rgba(0,0,0,.13)",
              }}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {b.text || "Button"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

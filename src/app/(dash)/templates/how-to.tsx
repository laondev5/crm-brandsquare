/**
 * Numbered instructions at the top of each templates tab. Open by default so
 * nobody has to know it is there; one click folds it away for people who
 * already know the routine.
 */
export default function HowTo({
  title = "How to use",
  steps,
}: {
  title?: string;
  steps: { title: string; body: React.ReactNode }[];
}) {
  return (
    <details className="card" open style={{ marginBottom: 20 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
        {title} — step by step
      </summary>
      <ol style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 14 }}>
        {steps.map((s, i) => (
          <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--p)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </span>
            <div>
              <strong style={{ color: "var(--ink)", fontSize: 13.5 }}>{s.title}</strong>
              <div style={{ fontSize: 13.5, color: "var(--txt)", marginTop: 2, lineHeight: 1.6 }}>{s.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

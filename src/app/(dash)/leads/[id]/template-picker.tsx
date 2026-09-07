"use client";

import { fillTemplate, type MessageTemplate } from "@/lib/types";

/**
 * Drops saved wording into whatever box it sits above.
 *
 * It resets itself to the placeholder after each pick, so choosing the same
 * template twice in a row actually fires twice — a select that stays on the
 * chosen option looks broken the second time.
 */
export default function TemplatePicker({
  templates,
  vars,
  onPick,
  label = "Use a template…",
}: {
  templates: MessageTemplate[];
  vars: { name?: string; email?: string; phone?: string; company?: string };
  onPick: (body: string, subject: string) => void;
  label?: string;
}) {
  if (templates.length === 0) return null;

  return (
    <select
      value=""
      aria-label={label}
      style={{ marginBottom: 8 }}
      onChange={(e) => {
        const t = templates.find((x) => String(x.id) === e.target.value);
        if (t) onPick(fillTemplate(t.body, vars), fillTemplate(t.subject ?? "", vars));
        e.target.value = "";
      }}
    >
      <option value="">{label}</option>
      {templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

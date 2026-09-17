"use client";

import type { LeadProperty } from "@/lib/types";

/** The right input for a property's kind. Uncontrolled when `name` is given. */
export default function PropInput({
  prop,
  value,
  onChange,
  name,
  defaultValue,
}: {
  prop: LeadProperty;
  value?: string;
  onChange?: (v: string) => void;
  name?: string;
  defaultValue?: string;
}) {
  const common = {
    name,
    ...(onChange ? { value: value ?? "", onChange: (e: { target: { value: string } }) => onChange(e.target.value) } : { defaultValue }),
  };
  if (prop.type === "select") {
    const current = onChange ? value : defaultValue;
    return (
      <select {...common}>
        <option value="">—</option>
        {prop.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {current && !prop.options.includes(current) && <option value={current}>{current}</option>}
      </select>
    );
  }
  if (prop.type === "textarea") return <textarea rows={3} {...common} />;
  const type =
    prop.type === "number" ? "number" : prop.type === "date" ? "date" : prop.type === "email" ? "email" : prop.type === "url" ? "url" : prop.type === "phone" ? "tel" : "text";
  return <input type={type} {...common} />;
}

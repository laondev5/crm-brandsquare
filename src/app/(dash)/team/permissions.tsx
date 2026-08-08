"use client";

import { PERMISSIONS, type Permission } from "@/lib/types";

/**
 * Uncontrolled by design — each checkbox just carries name="permissions" so
 * a plain form submit collects the checked ones via formData.getAll(), no
 * client state needed.
 */
export default function PermissionCheckboxes({ defaultChecked }: { defaultChecked: Permission[] }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {PERMISSIONS.map((p) => (
        <label key={p.key} className="chooser">
          <input
            type="checkbox"
            name="permissions"
            value={p.key}
            defaultChecked={defaultChecked.includes(p.key)}
          />
          <span>
            <strong>{p.label}</strong>
            <small>{p.hint}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

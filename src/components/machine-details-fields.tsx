"use client";

/**
 * The words about a machine live in their own section, not in the pricing
 * table. One card per line, in the same order as the line items, so the
 * `item_machine_description` and `item_suitable_for` fields line up with
 * `item_description` when the server action reads them back.
 */
export interface MachineDetailRow {
  key: string;
  /** The machine as it appears in the pricing table. */
  label: string;
  machine_description: string;
  suitable_for: string;
}

export default function MachineDetailsFields({
  rows,
  canEdit,
  onChange,
}: {
  rows: MachineDetailRow[];
  canEdit: boolean;
  onChange: (index: number, patch: Partial<Pick<MachineDetailRow, "machine_description" | "suitable_for">>) => void;
}) {
  const filled = rows.filter((row) => row.label.trim()).length;

  return (
    <div className="machine-details">
      <p className="doc-form__hint">
        {filled
          ? "One block per machine, printed after the pricing table. Copied from the catalogue when you added the line; edit freely here. Empty blocks are left off the document."
          : "Add a machine in Line items first. When you add one from the catalogue its description and suitable-for arrive here automatically."}
      </p>

      {rows.map((row, i) => {
        const label = row.label.split("\n")[0].trim();
        if (!label) {
          return (
            <div className="machine-details__blank" key={row.key}>
              <input type="hidden" name="item_machine_description" value="" readOnly />
              <input type="hidden" name="item_suitable_for" value="" readOnly />
              Line {i + 1} — no machine yet
            </div>
          );
        }

        return (
          <section className="machine-details__card" key={row.key} aria-label={`Machine details for ${label}`}>
            <header className="machine-details__title">
              <span className="machine-details__no">{i + 1}</span>
              <strong>{label}</strong>
            </header>
            <label className="f">
              <span>Description</span>
              <textarea
                name="item_machine_description"
                rows={3}
                readOnly={!canEdit}
                value={row.machine_description}
                onChange={(e) => onChange(i, { machine_description: e.target.value })}
                placeholder="What this machine does, in the words the customer should read."
              />
            </label>
            <label className="f">
              <span>Suitable for</span>
              <textarea
                name="item_suitable_for"
                rows={2}
                readOnly={!canEdit}
                value={row.suitable_for}
                onChange={(e) => onChange(i, { suitable_for: e.target.value })}
                placeholder="Commercial flour production, bakeries, animal feed…"
              />
            </label>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface RecordPanel {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export default function RecordTabs({
  id,
  panels,
  initial,
}: {
  id: string;
  panels: RecordPanel[];
  /** A tab to open from a link (`?tab=details`), so a button elsewhere on the
   *  page can land on the panel it means. */
  initial?: string;
}) {
  const [activeId, setActiveId] = useState(initial ?? panels[0]?.id);

  useEffect(() => {
    if (initial) setActiveId(initial);
  }, [initial]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedId = panels.some((panel) => panel.id === activeId) ? activeId : panels[0]?.id;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (index + 1) % panels.length;
        break;
      case "ArrowLeft":
        next = (index - 1 + panels.length) % panels.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = panels.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveId(panels[next].id);
    tabs.current[next]?.focus();
  }

  if (!panels.length) return null;

  return (
    <div className="record-tabs" id={id}>
      <div className="record-tablist" role="tablist" aria-label="Record sections" aria-orientation="horizontal">
        {panels.map((panel, index) => (
          <button
            key={panel.id}
            ref={(element) => { tabs.current[index] = element; }}
            id={`${id}-tab-${panel.id}`}
            type="button"
            role="tab"
            className={selectedId === panel.id ? "is-current" : undefined}
            aria-selected={selectedId === panel.id}
            aria-controls={`${id}-panel-${panel.id}`}
            tabIndex={selectedId === panel.id ? 0 : -1}
            onClick={() => setActiveId(panel.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {panel.label}
            {panel.count !== undefined && <span className="pill">{panel.count}</span>}
          </button>
        ))}
      </div>
      {panels.map((panel) => (
        <div
          key={panel.id}
          id={`${id}-panel-${panel.id}`}
          className="record-panel"
          role="tabpanel"
          aria-labelledby={`${id}-tab-${panel.id}`}
          tabIndex={0}
          hidden={selectedId !== panel.id}
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}

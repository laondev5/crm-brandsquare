"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The sheet every document is written on.
 *
 * A quotation, a proforma invoice and a receipt ask for different things, but
 * they are read by the same customer and should look like they come from the
 * same desk: the logo and the business name on the top line, the document's
 * own number and dates opposite, a strip to jump between sections, and the
 * figures kept at the side while the form is filled in.
 */
export function DocumentForm({
  action,
  title,
  number,
  meta = [],
  sections = [],
  summaryTitle,
  summary,
  save,
  children,
}: {
  action: (formData: FormData) => void;
  /** What the paper is: Quotation, Proforma invoice, Payment receipt. */
  title: string;
  number?: string;
  meta?: string[];
  sections?: { id: string; label: string }[];
  summaryTitle: string;
  summary: ReactNode;
  save?: ReactNode;
  children: ReactNode;
}) {
  return (
    <form action={action} className="doc-form">
      <header className="doc-form__head">
        <div className="doc-form__brand">
          <Image src="/logo-icon.webp" alt="" width={44} height={44} priority />
          <div>
            <b>Brandsquare</b>
            <span>{title}</span>
          </div>
        </div>
        <div className="doc-form__marks">
          {number && <b>{number}</b>}
          {meta.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </header>

      {sections.length > 0 && (
        <nav className="doc-form__nav" aria-label={`${title} sections`}>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>{section.label}</a>
          ))}
        </nav>
      )}

      <div className="doc-form__grid">
        <div className="doc-form__main">{children}</div>

        <aside className="doc-form__aside">
          <div className="doc-form__summary">
            <h2>{summaryTitle}</h2>
            {summary}
            {save}
          </div>
        </aside>
      </div>
    </form>
  );
}

/** One numbered part of the form, with the anchor its nav link points at. */
export function DocumentSection({
  id,
  step,
  title,
  children,
}: {
  id: string;
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="doc-form__section" id={id}>
      <h2>
        <span className="doc-form__step">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

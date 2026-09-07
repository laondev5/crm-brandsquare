"use client";

/** A read-only value meant to be copied — selecting it all on focus is the
 *  same convenience the connected-website key display uses. */
export default function SelectOnFocusInput({ value }: { value: string }) {
  return (
    <input
      type="text"
      readOnly
      value={value}
      onFocus={(e) => e.target.select()}
    />
  );
}

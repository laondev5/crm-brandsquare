"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Dates are passed around as plain `YYYY-MM-DD` strings, and these two helpers
 * deliberately avoid Date.parse / toISOString. Both treat a bare date as UTC,
 * so west of Greenwich `new Date("2026-08-26")` is the evening of the 25th and
 * a round trip silently moves the day. Building from local parts keeps the
 * date the user picked.
 */
function parseISO(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? undefined : d;
}

function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DateField({
  id,
  name,
  defaultValue = "",
  placeholder = "Pick a date",
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const selected = parseISO(value);

  return (
    <div className="relative">
      {/* The real form value. The calendar is only the way of choosing it. */}
      <input type="hidden" name={name} value={value} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "h-9 w-full justify-start gap-2 px-3 font-normal",
              !selected && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-60" />
            {selected
              ? selected.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : placeholder}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-3">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            autoFocus
            onSelect={(d) => {
              setValue(d ? toISO(d) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      {selected && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear date"
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-sm border-0 bg-transparent p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Time stays a native time input because a calendar has no equivalent for it
 * and a dropdown of slots cannot express an arbitrary time — but the browser's
 * own picker glyph is hidden so it reads as part of the same set of controls.
 */
export function TimeField({
  id,
  name,
  defaultValue = "",
}: {
  id?: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="time"
        defaultValue={defaultValue}
        className={cn(
          "flex h-9 w-full rounded-md border-[1px] border-solid border-input bg-background px-3 py-1 text-sm text-foreground outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
          "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        )}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * react-day-picker v10 ships its own stylesheet, which is not imported here on
 * purpose — it would arrive unlayered and so outrank everything, including the
 * legacy stylesheet. The classNames below dress it with Tailwind instead, so
 * the calendar stays inside the same cascade as every other component.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center px-8",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 h-8 px-0",
        button_previous:
          "inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 cursor-pointer",
        button_next:
          "inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 cursor-pointer",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[11px] font-medium text-muted-foreground",
        week: "flex w-full mt-1",
        day: "size-8 p-0 text-center text-sm",
        day_button:
          "size-8 rounded-md border-0 bg-transparent p-0 text-sm font-normal text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:font-bold [&>button]:text-primary",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        disabled: "[&>button]:opacity-40 [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * `border-[1px] border-solid` rather than plain `border` — with preflight off
 * there is no global `border-style: solid`, so a width-only utility would
 * leave the field showing the browser's own inset border instead of this one.
 *
 * No `!important` needed anywhere else: the legacy stylesheet's bare
 * `input[type=...]` rules sit in a layer below `utilities`, so these classes
 * already win on layer order regardless of specificity.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border-[1px] border-solid border-input bg-background px-3 py-1 text-sm text-foreground outline-none transition-colors",
        "placeholder:text-muted-foreground",
        "file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };

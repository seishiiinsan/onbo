import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg border border-[var(--color-line)] bg-white px-3 text-sm outline-none placeholder:text-[var(--color-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

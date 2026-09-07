import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "h-10 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3.5 text-sm outline-none transition-colors placeholder:text-[var(--color-muted)]/70 focus-visible:border-[var(--color-brand)] focus-visible:ring-4 focus-visible:ring-[var(--color-brand)]/10 disabled:bg-[var(--color-canvas)] disabled:text-[var(--color-muted)]";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(base, "h-auto min-h-20 py-2.5 leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(base, "cursor-pointer appearance-none pr-8", className)}
    {...props}
  />
));
Select.displayName = "Select";

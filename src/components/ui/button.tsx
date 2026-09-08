import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-ink)] text-white hover:bg-black shadow-sm shadow-black/5",
        accent:
          "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-ink)] shadow-sm shadow-[var(--color-brand)]/25",
        outline:
          "border border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-ink)]",
        soft: "bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)] hover:brightness-97",
        ghost:
          "text-[var(--color-muted)] hover:bg-black/[0.04] hover:text-[var(--color-ink)]",
        danger: "text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status pill.
 *
 * `tone` picks an accent from the palette ramp; the `soft` variants use the
 * tinted background so a page can carry several different accents without any
 * of them shouting. `solid` variants are for the one thing that must stand out.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
        // Tinted stops — one per accent in the ramp.
        amber: "border-primary/25 bg-primary-soft text-primary-strong",
        teal: "border-teal/25 bg-teal-soft text-teal-strong",
        violet: "border-violet/25 bg-violet-soft text-violet-strong",
        rose: "border-rose/25 bg-rose-soft text-rose-strong",
        indigo: "border-indigo/25 bg-indigo-soft text-indigo-strong",
        success: "border-success/25 bg-success-soft text-success",
        warning: "border-warning/25 bg-warning-soft text-warning",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };

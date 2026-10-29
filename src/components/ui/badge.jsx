import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-subtle text-primary",
        solid: "border-transparent bg-primary text-primary-foreground",
        outline: "border-border bg-surface text-foreground",
        neutral: "border-transparent bg-muted text-muted-foreground",
        success: "border-success/30 bg-success-subtle text-success-text",
        destructive: "border-destructive/30 bg-destructive-subtle text-destructive-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

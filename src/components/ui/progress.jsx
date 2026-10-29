import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Determinate progress bar. Pass an accessible name via aria-label or aria-labelledby. */
function Progress({ className, value = 0, max = 100, indicatorClassName, ...props }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={Math.min(Math.max(value, 0), max)}
      max={max}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full bg-primary transition-[width] duration-300", indicatorClassName)}
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

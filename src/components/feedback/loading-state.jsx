import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function LoadingState({ label = "Loading", className }) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground",
        className,
      )}
    >
      <Spinner label={label} />
      <span aria-hidden="true">{label}…</span>
    </div>
  );
}

function CardSkeleton({ lines = 3, className }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-6", className)}>
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export { CardSkeleton, LoadingState };

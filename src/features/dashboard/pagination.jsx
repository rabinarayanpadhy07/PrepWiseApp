import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Previous / next pager for paginated API lists (DRF page-number pagination). */
function Pagination({ page, count, pageSize, onPageChange, isFetching = false, label = "Pages" }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 text-sm">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || isFetching}
      >
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <span className="text-muted-foreground" aria-live="polite">
        Page {page} of {pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages || isFetching}
      >
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}

export { Pagination };

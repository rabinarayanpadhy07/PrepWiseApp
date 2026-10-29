import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, label = "Loading", ...props }) {
  return (
    <span role="status" className="inline-flex items-center" {...props}>
      <Loader2 className={cn("size-5 animate-spin text-primary", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export { Spinner };

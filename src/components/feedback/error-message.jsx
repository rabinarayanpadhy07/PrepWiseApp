import { AlertCircle, RotateCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeLimit } from "@/lib/usage";
import { cn } from "@/lib/utils";

/**
 * Displays an error for a failed request or action.
 * `error` may be an ApiError (from lib/api/client) or any Error. Usage-limit
 * errors also show how much was used and when the limit resets. `children`
 * can add actions (for example a link to renew).
 */
function ErrorMessage({ title = "Something went wrong", error, message, onRetry, className, children }) {
  const text = message ?? error?.message ?? "Please try again.";
  const requestId = error?.requestId;
  const limitText = describeLimit(error?.limit);

  return (
    <Alert variant="destructive" role="alert" className={cn(className)}>
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{text}</p>
        {limitText ? <p className="mt-1">{limitText}</p> : null}
        {requestId ? (
          <p className="mt-1 text-xs">
            Reference: <span className="font-mono">{requestId}</span>
          </p>
        ) : null}
        {onRetry ? (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        ) : null}
        {children ? <div className="mt-3 flex flex-wrap gap-2">{children}</div> : null}
      </AlertDescription>
    </Alert>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-destructive-text">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export { ErrorMessage, FieldError };

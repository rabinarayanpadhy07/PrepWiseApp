import { useId, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELD_LABELS = { non_field_errors: "", detail: "" };

/** An API error, with each field's validation messages listed. */
export function ServerErrors({ error, title = "The change wasn't saved" }) {
  if (!error) return null;
  const details = error.details ? Object.entries(error.details) : [];
  return (
    <ErrorMessage title={title} error={error}>
      {details.length ? (
        <ul className="w-full list-disc space-y-1 pl-5 text-sm">
          {details.map(([field, messages]) => (
            <li key={field}>
              {FIELD_LABELS[field] === "" ? "" : `${field.replaceAll("_", " ")}: `}
              {[].concat(messages).join(" ")}
            </li>
          ))}
        </ul>
      ) : null}
    </ErrorMessage>
  );
}

/** Field-level message from an ApiError's validation details. */
export function fieldError(error, field) {
  const messages = error?.details?.[field];
  return messages ? [].concat(messages).join(" ") : undefined;
}

/** Loading, error and empty states for a query, then `children(data)`. */
export function QueryState({ query, isEmpty, empty, lines = 4, children }) {
  if (query.isPending) return <CardSkeleton lines={lines} />;
  if (query.error) {
    return <ErrorMessage title="Couldn't load this data" error={query.error} onRetry={query.refetch} />;
  }
  if (isEmpty?.(query.data)) return empty ?? <EmptyState title="Nothing to show" />;
  return children(query.data);
}

export function Stat({ label, value, detail }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight break-words">{value}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

/**
 * Confirmation dialog for an administrative change. Collects an optional (or
 * required) reason that is stored in the audit log. `onConfirm(reason)` returns
 * a promise; errors are shown in the dialog.
 */
export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  reasonRequired = false,
  onConfirm,
  children,
}) {
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [missing, setMissing] = useState(false);

  const close = (next) => {
    if (!next) {
      setReason("");
      setError(null);
      setMissing(false);
    }
    onOpenChange(next);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (reasonRequired && !reason.trim()) {
      setMissing(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      close(false);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
          <div className="grid gap-2">
            <Label htmlFor={reasonId}>Reason {reasonRequired ? "" : "(optional)"}</Label>
            <Textarea
              id={reasonId}
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={missing || undefined}
            />
            <p className="text-xs text-muted-foreground">Stored in the audit log with this change.</p>
            {missing ? <p className="text-sm text-destructive-text">Enter a reason.</p> : null}
          </div>
          <ServerErrors error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} isLoading={pending}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Estimated cost in the platform cost currency, shown as a currency code. */
export function formatCost(amount, currency) {
  if (amount === null || amount === undefined) return "No estimate";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "USD",
    currencyDisplay: "code",
    maximumFractionDigits: 4,
  }).format(Number(amount));
}

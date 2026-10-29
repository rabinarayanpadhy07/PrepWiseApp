import { CalendarClock, CheckCircle2, CircleAlert, CreditCard, Receipt } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlatformUsageMeters } from "@/features/ai/usage-meters";
import { useCheckout } from "@/features/billing/checkout";
import { Pagination } from "@/features/dashboard/pagination";
import { DownloadButton } from "@/features/reports/download-button";
import { usePaymentHistory, usePlans, useSubscriptionStatus } from "@/lib/api/billing";
import { reportUrls } from "@/lib/api/dashboard";
import { formatDate, formatDateTime, formatMoney, pluralize } from "@/lib/format";

const SUBSCRIPTION_STATES = {
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "neutral" },
  revoked: { label: "Revoked", variant: "destructive" },
  none: { label: "No subscription", variant: "neutral" },
};

function SubscriptionCard({ status }) {
  const state = SUBSCRIPTION_STATES[status.status] ?? SUBSCRIPTION_STATES.none;
  const { current } = status;
  const last = status.history[0];
  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle as="h2">Platform AI subscription</CardTitle>
          <Badge variant={state.variant}>{state.label}</Badge>
        </div>
        <CardDescription>
          {current
            ? `${current.plan_name}: ${formatDate(current.starts_at)} to ${formatDate(current.ends_at)}. It doesn't renew automatically.`
            : status.status === "revoked" && last
              ? `Access ended on ${formatDate(last.revoked_at)}: ${last.revoke_reason || "revoked"}.`
              : status.status === "expired" && last
                ? `Your last period ended on ${formatDate(last.ends_at)}. Buy another period to continue.`
                : "Buy a plan to use platform AI. You can also use your own API key without a subscription."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {status.upcoming.length ? (
          <ul className="space-y-1 text-sm">
            {status.upcoming.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                Next period: {formatDate(item.starts_at)} to {formatDate(item.ends_at)}
              </li>
            ))}
          </ul>
        ) : null}
        {current ? <PlatformUsageMeters usage={current.usage} idPrefix="billing-usage" /> : null}
      </CardContent>
    </Card>
  );
}

function CheckoutStatus({ state, onDismiss }) {
  switch (state.step) {
    case "starting":
    case "paying":
      return <LoadingState className="min-h-24" label="Waiting for the payment window" />;
    case "verifying":
    case "confirming":
      return (
        <LoadingState
          className="min-h-24"
          label="Confirming your payment with the payment provider. Please keep this page open"
        />
      );
    case "paid":
      return (
        <Alert variant="success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Payment confirmed</AlertTitle>
          <AlertDescription>
            {state.order.subscription
              ? `Your access runs from ${formatDate(state.order.subscription.starts_at)} to ${formatDate(state.order.subscription.ends_at)}.`
              : "Your subscription is active."}{" "}
            Your invoice is in the payment history below.
          </AlertDescription>
        </Alert>
      );
    case "unconfirmed":
      return (
        <Alert variant="info" role="status">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>We haven&apos;t confirmed this payment yet</AlertTitle>
          <AlertDescription>
            <p>
              If you completed the payment, your access appears here as soon as the payment
              provider confirms it. If it was declined, you haven&apos;t been charged.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onDismiss}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      );
    case "cancelled":
      return (
        <Alert variant={state.reason ? "destructive" : "info"} role="status">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>{state.reason ? "The payment didn't go through" : "Payment cancelled"}</AlertTitle>
          <AlertDescription>
            {state.reason ?? "You closed the payment window. Nothing was charged."}
          </AlertDescription>
        </Alert>
      );
    case "error":
      return <ErrorMessage title="The payment couldn't be completed" error={state.error} />;
    default:
      return null;
  }
}

function BuyCard({ status }) {
  const plans = usePlans();
  const { state, buy, reset } = useCheckout();
  const busy = ["starting", "paying", "verifying", "confirming"].includes(state.step);
  const active = status.current;
  const lastEnd = status.upcoming.at(-1)?.ends_at ?? active?.ends_at;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle as="h2">{active ? "Renew" : "Buy platform AI"}</CardTitle>
        <CardDescription>
          One-time payment. Nothing renews automatically.
          {lastEnd
            ? ` A purchase now starts when your current access ends (${formatDate(lastEnd)}).`
            : " Access starts as soon as the payment is confirmed."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.payments_enabled ? (
          <p className="text-sm text-muted-foreground">
            Online payment isn&apos;t available right now. You can use your own API key in the
            meantime.
          </p>
        ) : plans.isPending ? (
          <CardSkeleton lines={2} className="border-0 p-0" />
        ) : plans.error ? (
          <ErrorMessage title="Couldn't load plans" error={plans.error} onRetry={plans.refetch} />
        ) : (
          <ul className="space-y-3">
            {plans.data.map((plan) => (
              <li
                key={plan.code}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(plan.price_minor, plan.currency)} for{" "}
                    {pluralize(plan.duration_days, "day")}
                  </p>
                </div>
                <Button onClick={() => buy(plan.code)} disabled={busy}>
                  <CreditCard aria-hidden="true" />
                  {active ? "Buy another period" : "Buy now"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <CheckoutStatus state={state} onDismiss={reset} />
      </CardContent>
    </Card>
  );
}

const ORDER_STATES = {
  paid: { label: "Paid", variant: "success" },
  review: { label: "Under review", variant: "destructive" },
  created: { label: "Not completed", variant: "neutral" },
  failed: { label: "Failed", variant: "destructive" },
};

function paymentNote(order) {
  const payment = order.payments[0];
  if (!payment) return null;
  if (payment.status === "refunded") return "Refunded in full; access was revoked.";
  if (payment.status === "partially_refunded") {
    return `Refunded ${formatMoney(payment.amount_refunded_minor, payment.currency)}.`;
  }
  if (payment.dispute_status) return `Dispute: ${payment.dispute_status}.`;
  if (payment.status === "failed") return "The payment failed.";
  if (order.status === "review") return "The payment didn't match this order and is being reviewed.";
  return null;
}

function PaymentHistory() {
  const [page, setPage] = useState(1);
  const history = usePaymentHistory(page);

  if (history.isPending) return <CardSkeleton lines={4} />;
  if (history.error) {
    return <ErrorMessage title="Couldn't load payment history" error={history.error} onRetry={history.refetch} />;
  }
  if (history.data.count === 0) {
    return <EmptyState icon={Receipt} title="No payments yet" description="Your payments and invoices appear here." />;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <caption className="sr-only">Payment history</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.data.results.map((order) => {
              const state = ORDER_STATES[order.status] ?? ORDER_STATES.created;
              const note = paymentNote(order);
              return (
                <TableRow key={order.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(order.paid_at ?? order.created_at)}
                  </TableCell>
                  <TableCell>
                    {order.plan.name}
                    <span className="block text-xs text-muted-foreground">
                      {pluralize(order.plan.duration_days, "day")}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatMoney(order.amount_minor, order.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={state.variant}>{state.label}</Badge>
                    {note ? <span className="mt-1 block text-xs text-muted-foreground">{note}</span> : null}
                  </TableCell>
                  <TableCell>
                    {order.invoice ? (
                      <DownloadButton
                        url={reportUrls.invoice(order.invoice.id)}
                        filename={`${order.invoice.number}.pdf`}
                        aria-label={`Download invoice ${order.invoice.number}`}
                      >
                        {order.invoice.number}
                      </DownloadButton>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={page}
        count={history.data.count}
        pageSize={10}
        onPageChange={setPage}
        isFetching={history.isFetching}
        label="Payment history pages"
      />
    </div>
  );
}

function BillingPage() {
  const status = useSubscriptionStatus();

  return (
    <>
      <DocumentTitle title="Billing" />
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          description="Your platform AI subscription, payments and invoices."
        />
        {status.isPending ? (
          <CardSkeleton lines={4} />
        ) : status.error ? (
          <ErrorMessage title="Couldn't load your subscription" error={status.error} onRetry={status.refetch} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <SubscriptionCard status={status.data} />
            <BuyCard status={status.data} />
          </div>
        )}
        <section aria-labelledby="payments-heading" className="space-y-3">
          <h2 id="payments-heading" className="text-base font-semibold">
            Payment history
          </h2>
          <PaymentHistory />
        </section>
        <section aria-labelledby="refunds-heading" className="space-y-2 text-sm text-muted-foreground">
          <h2 id="refunds-heading" className="text-base font-semibold text-foreground">
            Refunds and reversals
          </h2>
          <p>
            A full refund ends the access that payment bought immediately. A partial refund keeps
            your access. If a payment is disputed with your bank, access continues while the dispute
            is open and ends if the dispute is decided against the payment.
          </p>
        </section>
      </div>
    </>
  );
}

export default BillingPage;

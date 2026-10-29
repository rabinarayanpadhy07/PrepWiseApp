import { Link } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QueryState, Stat, formatCost } from "@/features/admin/admin-components";
import { useAdminQuery } from "@/lib/api/admin";
import { formatMoney, formatNumber } from "@/lib/format";

function AdminOverviewPage() {
  const query = useAdminQuery("/admin/overview/");
  return (
    <QueryState query={query}>
      {(data) => {
        const { platform_ai: ai, revenue_this_month: revenue } = data;
        return (
          <div className="space-y-6">
            {data.payments_needing_review ? (
              <Alert variant="destructive" role="status">
                <AlertTitle>{formatNumber(data.payments_needing_review)} payment(s) need review</AlertTitle>
                <AlertDescription>
                  Orders whose payment didn&apos;t match, or duplicate payments to refund.
                  <Button asChild variant="link" size="sm" className="px-1">
                    <Link to="/app/admin/payments?status=review">Open payments</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <section aria-label="Users" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Users" value={formatNumber(data.users.total)} detail={`${formatNumber(data.users.new_this_month)} joined this month`} />
              <Stat label="Suspended" value={formatNumber(data.users.suspended)} />
              <Stat label="With their own API key" value={formatNumber(data.users.with_byok_key)} />
              <Stat
                label="Active subscribers"
                value={formatNumber(data.subscriptions.active)}
                detail={`${formatNumber(data.subscriptions.upcoming)} renewals queued`}
              />
            </section>
            <section aria-label="Revenue and costs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Payments this month"
                value={formatMoney(revenue.gross_minor, revenue.currency)}
                detail={`${formatNumber(revenue.paid_orders)} paid orders, captured by the gateway`}
              />
              <Stat label="Refunded this month" value={formatMoney(revenue.refunded_minor, revenue.currency)} />
              <Stat
                label="Estimated platform AI spend this month"
                value={formatCost(ai.estimated_spend_this_month, ai.currency)}
                detail={
                  ai.monthly_spend_cap === null
                    ? "No spending cap set: platform AI is refused"
                    : `Cap ${formatCost(ai.monthly_spend_cap, ai.currency)}. An estimate from configured prices, not the provider's bill.`
                }
              />
              <Stat
                label="Provider calls (24 hours)"
                value={formatNumber(data.provider_calls_24h.total)}
                detail={`${formatNumber(data.provider_calls_24h.errors)} errors`}
              />
            </section>
          </div>
        );
      }}
    </QueryState>
  );
}

export default AdminOverviewPage;

import { Progress } from "@/components/ui/progress";
import { formatDuration, formatNumber } from "@/lib/format";
import { providerLabel, USAGE_KINDS } from "@/lib/usage";

function Meter({ id, label, window, format, suffix }) {
  const used = window.used + (window.in_progress ?? 0);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span id={id} className="font-medium">
          {label}
          {suffix ? <span className="font-normal text-muted-foreground"> {suffix}</span> : null}
        </span>
        <span className="text-muted-foreground">
          {format(window.remaining)} of {format(window.limit)} left
        </span>
      </div>
      <Progress value={used} max={window.limit} aria-labelledby={id} />
      {window.in_progress ? (
        <p className="text-xs text-muted-foreground">
          {format(window.in_progress)} reserved for requests in progress
        </p>
      ) : null}
    </div>
  );
}

/**
 * Platform-paid allowances for the current subscription: the period total and,
 * where the plan sets one, today's limit. `usage` is subscription_summary().usage.
 */
function PlatformUsageMeters({ usage, idPrefix = "usage" }) {
  return (
    <div className="space-y-4">
      {USAGE_KINDS.map((kind) => {
        const entry = usage?.[kind.key];
        if (!entry) return null;
        return (
          <div key={kind.key} className="space-y-3">
            <Meter
              id={`${idPrefix}-${kind.key}-period`}
              label={kind.label}
              suffix="this period"
              window={entry.period}
              format={kind.format}
            />
            {entry.daily ? (
              <Meter
                id={`${idPrefix}-${kind.key}-daily`}
                label={kind.label}
                suffix="today"
                window={entry.daily}
                format={kind.format}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function formatCost(amount, currency) {
  if (amount === null || amount === undefined || !currency) return "No estimate";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    // The provider's billing currency, as a code so it isn't mistaken for INR prices.
    currencyDisplay: "code",
    maximumFractionDigits: 4,
  }).format(Number(amount));
}

/**
 * Usage on the user's own keys. Costs are PrepWise's estimate of what the
 * provider bills the user, never platform revenue.
 */
function ByokUsageSummary({ byokUsage }) {
  const rows = byokUsage.month.by_provider;
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-muted-foreground">Tokens today</dt>
          <dd className="font-medium">{formatNumber(byokUsage.today.tokens)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tokens this month</dt>
          <dd className="font-medium">{formatNumber(byokUsage.month.tokens)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Interviews today</dt>
          <dd className="font-medium">
            {formatNumber(byokUsage.interviews_today.used)}
            {byokUsage.interviews_today.limit !== null
              ? ` of ${formatNumber(byokUsage.interviews_today.limit)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Voice time left today</dt>
          <dd className="font-medium">{formatDuration(byokUsage.voice_today.remaining)}</dd>
        </div>
      </dl>
      {rows.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((row) => (
            <li
              key={`${row.provider}-${row.cost_currency}`}
              className="flex flex-wrap justify-between gap-2 px-3 py-2"
            >
              <span>{providerLabel(row.provider)}</span>
              <span className="text-muted-foreground">
                {formatNumber(row.tokens)} tokens · est.{" "}
                {formatCost(row.estimated_cost, row.cost_currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Billed to you by your provider. Cost figures are estimates from configured prices; your
        provider&apos;s bill is authoritative.
      </p>
    </div>
  );
}

export { ByokUsageSummary, PlatformUsageMeters };

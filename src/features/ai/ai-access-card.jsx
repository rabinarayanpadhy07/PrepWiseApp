import { CreditCard, KeyRound } from "lucide-react";
import { Link } from "react-router";

import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlatformUsageMeters } from "@/features/ai/usage-meters";
import { useAccessStatus } from "@/lib/api/ai";
import { formatDate } from "@/lib/format";

/** User-facing explanation of AccessStatus.platform_status. */
export const PLATFORM_STATUS = {
  available: { label: "Active", variant: "success" },
  subscription_required: {
    label: "No subscription",
    variant: "neutral",
    text: "Buy a plan to use platform AI without your own key.",
  },
  subscription_expired: {
    label: "Expired",
    variant: "neutral",
    text: "Your subscription has ended. Subscriptions don't renew automatically; renew to continue.",
  },
  not_configured: {
    label: "Unavailable",
    variant: "destructive",
    text: "Platform AI is temporarily unavailable. Please try again later.",
  },
  budget_exhausted: {
    label: "Paused",
    variant: "destructive",
    text: "Platform AI has reached its spending limit for this month. You can use your own API key in the meantime.",
  },
};

function PlatformSection({ data }) {
  const status = PLATFORM_STATUS[data.platform_status] ?? PLATFORM_STATUS.not_configured;
  const { subscription } = data;
  return (
    <section aria-labelledby="platform-ai-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 id="platform-ai-heading" className="text-sm font-semibold">
          Platform AI
        </h3>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      {subscription ? (
        <>
          <p className="text-sm text-muted-foreground">
            {subscription.plan_name}, active until {formatDate(subscription.ends_at)}. It
            doesn&apos;t renew automatically.
          </p>
          {status.text ? <p className="text-sm text-muted-foreground">{status.text}</p> : null}
          <PlatformUsageMeters usage={subscription.usage} idPrefix="access-usage" />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{status.text}</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/billing">
              {data.platform_status === "subscription_expired" ? "Renew" : "See plans"}
            </Link>
          </Button>
        </>
      )}
    </section>
  );
}

function ByokSection({ data, showManageLink }) {
  return (
    <section aria-labelledby="byok-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 id="byok-heading" className="text-sm font-semibold">
          Your own API key
        </h3>
        <Badge variant={data.byok_available ? "success" : "neutral"}>
          {data.byok_available ? "Saved" : "Not added"}
        </Badge>
      </div>
      {data.credentials.length ? (
        <ul className="space-y-1 text-sm">
          {data.credentials.map((credential) => (
            <li key={credential.provider} className="flex flex-wrap items-center gap-2">
              <span>{credential.provider_label}</span>
              <span className="font-mono text-muted-foreground">{credential.masked_key}</span>
              {credential.status === "invalid" ? (
                <Badge variant="destructive">Rejected by provider</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Available on every account, with or without a subscription. Your provider bills that
          usage directly.
        </p>
      )}
      {showManageLink ? (
        <Button asChild size="sm" variant="outline">
          <Link to="/app/settings?tab=ai">
            {data.credentials.length ? "Manage keys" : "Add your API key"}
          </Link>
        </Button>
      ) : null}
    </section>
  );
}

/** How the user can use AI right now: platform subscription and/or their own keys. */
function AiAccessCard({ showManageLink = true }) {
  const { data, isPending, error, refetch } = useAccessStatus();

  if (isPending) return <CardSkeleton lines={3} />;
  if (error) return <ErrorMessage title="Couldn't load AI access" error={error} onRetry={refetch} />;

  const ready = data.platform_status === "available" || data.byok_available;
  return (
    <Card className={ready ? "gap-4" : "gap-4 border-dashed"}>
      <CardHeader>
        <CardTitle as="h2">{ready ? "AI access" : "Set up AI access"}</CardTitle>
        <CardDescription>
          {ready
            ? data.billing_choice_required
              ? "You have a subscription and your own key. Each AI request asks which one to use, or set a default in Settings."
              : "Resume analysis, mock interviews and feedback are ready to use."
            : "Resume analysis, mock interviews and feedback need AI: add your own API key or buy a platform AI plan."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <PlatformSection data={data} />
        <Separator />
        <ByokSection data={data} showManageLink={showManageLink} />
      </CardContent>
    </Card>
  );
}

export { AiAccessCard };

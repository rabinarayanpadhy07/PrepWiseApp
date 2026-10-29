import { CalendarClock, Check, KeyRound, RefreshCcw, Tag } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { usePlans } from "@/lib/api/billing";
import { formatDuration, formatMoney, formatNumber, pluralize } from "@/lib/format";

function renewalLabel(plan) {
  return plan.renewal_mode === "manual"
    ? "Manual renewal. No automatic recurring billing."
    : "Renews automatically.";
}

function PlanCard({ plan }) {
  const { user } = useAuth();
  const duration = pluralize(plan.duration_days, "day");

  return (
    <Card className="h-full gap-5 border-primary/40">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h2" className="text-lg">
            {plan.name}
          </CardTitle>
          <Badge>Platform AI</Badge>
        </div>
        {plan.description ? <CardDescription>{plan.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-4xl font-semibold tracking-tight">
            {formatMoney(plan.price_minor, plan.currency)}
          </span>
          <span className="text-muted-foreground">for {duration}</span>
        </p>
        <ul className="space-y-3 text-sm leading-6">
          <li className="flex gap-2.5">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {duration} of access from the date of payment.
          </li>
          <li className="flex gap-2.5">
            <RefreshCcw className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {renewalLabel(plan)}
          </li>
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Uses PrepWise&apos;s platform AI, so you don&apos;t need your own API key.
          </li>
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Includes up to {formatNumber(plan.interview_quota)} mock interviews,{" "}
            {formatDuration(plan.voice_seconds_quota)} of voice answers and{" "}
            {formatNumber(plan.ai_token_quota)} AI tokens per period.
          </li>
          {plan.daily_ai_token_limit || plan.daily_interview_limit || plan.daily_voice_seconds_limit ? (
            <li className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Daily limits:{" "}
              {[
                plan.daily_interview_limit ? `${formatNumber(plan.daily_interview_limit)} interviews` : null,
                plan.daily_ai_token_limit ? `${formatNumber(plan.daily_ai_token_limit)} AI tokens` : null,
                plan.daily_voice_seconds_limit
                  ? `${formatDuration(plan.daily_voice_seconds_limit)} of voice`
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
              .
            </li>
          ) : null}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto flex-col items-stretch gap-2">
        <Button asChild>
          <Link to={user ? "/app/billing" : "/register"}>{user ? "Buy now" : "Create account"}</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          One-time payment, confirmed by the payment provider before access starts.
        </p>
      </CardFooter>
    </Card>
  );
}

function ByokCard() {
  return (
    <Card className="h-full gap-5">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h2" className="text-lg">
            Bring Your Own API Key
          </CardTitle>
          <Badge variant="neutral">BYOK</Badge>
        </div>
        <CardDescription>
          Run PrepWise&apos;s AI features through your own AI provider account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm leading-6">
          <li className="flex gap-2.5">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Add an Anthropic, OpenAI or Google Gemini API key in your account settings.
          </li>
          <li className="flex gap-2.5">
            <Tag className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Usage on your key is billed to you by your provider.
          </li>
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Available on every account, with or without a subscription. Remove your key at any time.
          </li>
        </ul>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild variant="outline" className="w-full">
          <Link to="/features#ai-access">Learn more about BYOK</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function PlanList() {
  const { data: plans, isPending, isError, error, refetch, isRefetching } = usePlans();

  if (isPending) {
    return (
      <div role="status" aria-label="Loading plans" className="h-full">
        <CardSkeleton lines={5} className="h-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="We couldn't load current pricing"
        error={error}
        onRetry={isRefetching ? undefined : () => refetch()}
      />
    );
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        title="No subscription plans are available right now"
        description="Please check back later."
      />
    );
  }

  return plans.map((plan) => <PlanCard key={plan.code} plan={plan} />);
}

function PricingPage() {
  const { data: plans } = usePlans();
  const plan = plans?.[0];

  return (
    <>
      <DocumentTitle
        title="Pricing"
        description="PrepWise pricing: a fixed-period subscription for platform AI with manual renewal, or bring your own AI provider API key."
      />
      <PageContainer className="pt-12 sm:pt-16">
        <PageHeader
          eyebrow="Pricing"
          title="Simple, upfront pricing"
          description="Pay once for a fixed period of platform AI access, or use your own API key. Nothing renews unless you choose to renew."
        />
      </PageContainer>

      <Section className="pt-10 sm:pt-12" aria-label="Plans">
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          <PlanList />
          <ByokCard />
        </div>
      </Section>

      <Section tone="surface" aria-labelledby="faq-heading">
        <SectionHeading id="faq-heading" title="Billing questions" />
        <dl className="mt-8 grid max-w-3xl gap-6">
          <div>
            <dt className="font-semibold">Will I be charged automatically when my access ends?</dt>
            <dd className="mt-1 text-muted-foreground">
              No. Subscriptions do not renew automatically. When your access period ends, you
              choose whether to buy another period.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">How long does a subscription last?</dt>
            <dd className="mt-1 text-muted-foreground">
              {plan
                ? `Each payment gives ${pluralize(plan.duration_days, "day")} of platform AI access.`
                : "Each payment gives access for the fixed period shown on the plan."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Who bills me for AI usage with BYOK?</dt>
            <dd className="mt-1 text-muted-foreground">
              Your AI provider. With BYOK, AI requests use your own provider key, so that usage is
              billed by your provider under your agreement with them.
            </dd>
          </div>
        </dl>
      </Section>
    </>
  );
}

export default PricingPage;

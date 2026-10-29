import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  KeyRound,
  MessagesSquare,
  Receipt,
  RotateCcw,
  ScanSearch,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { StatusBadge } from "@/components/feedback/status-badge";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_STATUS } from "@/features/ai/ai-access-card";
import { ByokUsageSummary, PlatformUsageMeters } from "@/features/ai/usage-meters";
import { useAuth } from "@/features/auth/auth-provider";
import { Pagination } from "@/features/dashboard/pagination";
import { CompetencyChart, SessionTrendChart } from "@/features/interviews/progress-charts";
import { DownloadButton } from "@/features/reports/download-button";
import { reportUrls, useActivity, useDashboardSummary } from "@/lib/api/dashboard";
import { useEvaluationSummary, useInterviews } from "@/lib/api/interviews";
import { useAnalyses } from "@/lib/api/resumes";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";

const RECENT = 5;
const ACTIVITY_PAGE_SIZE = 10;

function StatCard({ label, value, detail }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

function Stats({ counts }) {
  return (
    <section aria-label="Your activity in numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Resume analyses"
        value={formatNumber(counts.analyses_completed)}
        detail={`completed, of ${formatNumber(counts.analyses)} started`}
      />
      <StatCard
        label="Mock interviews"
        value={formatNumber(counts.interviews_completed)}
        detail={`completed, of ${formatNumber(counts.interviews)} started`}
      />
      <StatCard
        label="Answers given"
        value={formatNumber(counts.answers)}
        detail={`${formatNumber(counts.evaluations)} with AI feedback`}
      />
      <StatCard
        label="Average feedback score"
        value={counts.average_score === null ? "None yet" : `${counts.average_score.toFixed(1)} / 5`}
        detail={counts.average_score === null ? "Request feedback on an answer" : "across all scored answers"}
      />
    </section>
  );
}

const SUBSCRIPTION_LABELS = {
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "neutral" },
  revoked: { label: "Revoked", variant: "destructive" },
  none: { label: "None", variant: "neutral" },
};

function PlatformCard({ summary }) {
  const { subscription } = summary;
  const label = SUBSCRIPTION_LABELS[subscription.status] ?? SUBSCRIPTION_LABELS.none;
  const status = PLATFORM_STATUS[summary.platform_status];
  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle as="h2">Platform AI</CardTitle>
          <Badge variant={label.variant}>{label.label}</Badge>
        </div>
        <CardDescription>
          {subscription.status === "active"
            ? `${subscription.plan_name}, active until ${formatDate(subscription.ends_at)}. It doesn't renew automatically.`
            : subscription.status === "expired"
              ? `Your subscription ended on ${formatDate(subscription.ends_at)}.`
              : subscription.status === "revoked"
                ? "Your last subscription was revoked after a refund or payment reversal."
                : "No subscription. Platform-paid allowances appear here once you buy a plan."}
          {subscription.renewal_starts_at
            ? ` Your next period runs ${formatDate(subscription.renewal_starts_at)} to ${formatDate(subscription.renewal_ends_at)}.`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.platform_status !== "available" && status?.text && subscription.status === "active" ? (
          <p className="text-sm text-muted-foreground">{status.text}</p>
        ) : null}
        {summary.platform_usage ? (
          <PlatformUsageMeters usage={summary.platform_usage} idPrefix="dashboard-usage" />
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link to="/app/billing">
            {subscription.status === "active" ? "Billing and invoices" : "See plans"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ByokCard({ summary }) {
  const used = summary.byok_usage.month.tokens > 0;
  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle as="h2">Your own API key</CardTitle>
          <Badge variant={summary.has_byok_key ? "success" : "neutral"}>
            {summary.has_byok_key ? "Saved" : "Not added"}
          </Badge>
        </div>
        <CardDescription>
          Usage on your key is paid to your provider, separately from any PrepWise subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.has_byok_key || used ? (
          <ByokUsageSummary byokUsage={summary.byok_usage} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a key from Anthropic, OpenAI or Google Gemini to use AI features without a
            subscription.
          </p>
        )}
        <Button asChild size="sm" variant="outline">
          <Link to="/app/settings?tab=ai">{summary.has_byok_key ? "Manage keys" : "Add a key"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ProgressSection() {
  const { data, isPending, error, refetch } = useEvaluationSummary();
  return (
    <Card className="gap-4">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle as="h2">Progress over time</CardTitle>
        <Button asChild variant="link" size="sm">
          <Link to="/app/progress">Full progress</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <CardSkeleton lines={4} className="border-0 p-0" />
        ) : error ? (
          <ErrorMessage title="Couldn't load progress" error={error} onRetry={refetch} />
        ) : data.evaluation_count === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No scored answers yet"
            description="Answer interview questions and request feedback to see your scores over time."
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <h3 className="text-sm font-medium">Average score per interview</h3>
              {data.sessions.length >= 2 ? (
                <SessionTrendChart sessions={data.sessions} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  A trend appears after feedback in at least two interviews.
                </p>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <h3 className="text-sm font-medium">Average score by competency</h3>
              <CompetencyChart competencies={data.competencies} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ACTIVITY_ICONS = {
  analysis_completed: CheckCircle2,
  analysis_failed: CircleAlert,
  analysis_started: ScanSearch,
  interview_started: MessagesSquare,
  interview_completed: CheckCircle2,
  answer_evaluated: Sparkles,
  payment_received: Receipt,
  refund_processed: RotateCcw,
};

const ACTIVITY_LABELS = {
  analysis_completed: "Resume analysis completed",
  analysis_failed: "Resume analysis failed",
  analysis_started: "Resume analysis started",
  interview_started: "Interview started",
  interview_completed: "Interview completed",
  answer_evaluated: "Answer feedback",
  payment_received: "Payment received",
  refund_processed: "Refund processed",
};

function activityLink(target) {
  if (target.kind === "analysis") return `/app/analyses/${target.id}`;
  if (target.kind === "interview") return `/app/interviews/${target.id}`;
  return "/app/billing";
}

function ActivitySection() {
  const [page, setPage] = useState(1);
  const { data, isPending, error, refetch, isFetching } = useActivity(page);
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle as="h2">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending ? (
          <CardSkeleton lines={4} className="border-0 p-0" />
        ) : error ? (
          <ErrorMessage title="Couldn't load activity" error={error} onRetry={refetch} />
        ) : data.count === 0 ? (
          <EmptyState title="Nothing yet" description="Your analyses, interviews and payments appear here." />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {data.results.map((item, index) => {
                const Icon = ACTIVITY_ICONS[item.type] ?? Sparkles;
                return (
                  <li key={`${item.type}-${item.target.id}-${item.at}-${index}`}>
                    <Link
                      to={activityLink(item.target)}
                      className="flex items-start gap-3 rounded-md py-3 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {ACTIVITY_LABELS[item.type] ?? item.type}: {item.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.detail ? `${item.detail} · ` : ""}
                          {formatDateTime(item.at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={page}
              count={data.count}
              pageSize={ACTIVITY_PAGE_SIZE}
              onPageChange={setPage}
              isFetching={isFetching}
              label="Activity pages"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RecentList({ title, query, empty, renderItem, viewAllTo }) {
  const { data, isPending, error, refetch } = query;
  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle as="h2">{title}</CardTitle>
        <Button asChild variant="link" size="sm">
          <Link to={viewAllTo}>View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <CardSkeleton lines={3} className="border-0 p-0" />
        ) : error ? (
          <ErrorMessage error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          empty
        ) : (
          <ul className="divide-y divide-border">
            {data.slice(0, RECENT).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                {renderItem(item)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RowLink({ to, title, meta, status }) {
  return (
    <>
      <Link
        to={to}
        className="min-w-0 flex-1 rounded-md outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{meta}</span>
      </Link>
      <StatusBadge status={status} />
    </>
  );
}

function SummarySections() {
  const { data, isPending, error, refetch } = useDashboardSummary();
  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <CardSkeleton key={index} lines={1} />
          ))}
        </div>
        <CardSkeleton lines={5} />
      </div>
    );
  }
  if (error) return <ErrorMessage title="Couldn't load your dashboard" error={error} onRetry={refetch} />;
  return (
    <>
      <Stats counts={data.counts} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard summary={data} />
        <ByokCard summary={data} />
      </div>
    </>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const firstName = user.full_name?.split(" ")[0];
  const interviews = useInterviews();
  const analyses = useAnalyses();

  return (
    <>
      <DocumentTitle title="Dashboard" />
      <div className="space-y-6">
        <PageHeader
          title={firstName ? `Welcome, ${firstName}` : "Welcome"}
          description="Analyse your resume against a role, then practise with mock interviews and AI feedback."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/app/analyses/new">
                  <ScanSearch aria-hidden="true" />
                  Analyse a resume
                </Link>
              </Button>
              <Button asChild>
                <Link to="/app/interviews/new">
                  <MessagesSquare aria-hidden="true" />
                  Start an interview
                </Link>
              </Button>
            </>
          }
        />

        <SummarySections />
        <ProgressSection />

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentList
            title="Recent interviews"
            query={interviews}
            viewAllTo="/app/interviews"
            empty={
              <EmptyState
                icon={MessagesSquare}
                title="No interviews yet"
                description="Start a text or voice mock interview for any role."
                action={
                  <Button asChild size="sm">
                    <Link to="/app/interviews/new">
                      Start an interview <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
            }
            renderItem={(session) => (
              <>
                <RowLink
                  to={`/app/interviews/${session.id}`}
                  title={session.role_title}
                  meta={`${session.mode === "voice" ? "Voice" : "Text"} · ${session.answered_count} of ${session.question_count} answered · ${formatDate(session.created_at)}`}
                  status={session.status}
                />
                {session.answered_count ? (
                  <DownloadButton
                    url={reportUrls.interview(session.id)}
                    filename={`prepwise-interview-${session.id}.pdf`}
                    aria-label={`Download report for ${session.role_title}`}
                  >
                    Report
                  </DownloadButton>
                ) : null}
              </>
            )}
          />
          <RecentList
            title="Recent resume analyses"
            query={analyses}
            viewAllTo="/app/analyses"
            empty={
              <EmptyState
                icon={ScanSearch}
                title="No analyses yet"
                description="Compare your resume with a job description to find skill gaps."
                action={
                  <Button asChild size="sm">
                    <Link to="/app/analyses/new">
                      Analyse a resume <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
            }
            renderItem={(analysis) => (
              <>
                <RowLink
                  to={`/app/analyses/${analysis.id}`}
                  title={analysis.job_profile.title}
                  meta={`${analysis.resume.original_filename} · ${formatDate(analysis.created_at)}`}
                  status={analysis.status}
                />
                {analysis.status === "completed" ? (
                  <DownloadButton
                    url={reportUrls.analysis(analysis.id)}
                    filename={`prepwise-analysis-${analysis.id}.pdf`}
                    aria-label={`Download report for ${analysis.job_profile.title}`}
                  >
                    Report
                  </DownloadButton>
                ) : null}
              </>
            )}
          />
        </div>

        <ActivitySection />
      </div>
    </>
  );
}

export default DashboardPage;

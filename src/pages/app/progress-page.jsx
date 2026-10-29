import { TrendingUp } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiDisclaimer, AiGeneratedBadge } from "@/features/ai/ai-generated";
import { SCORE_LABELS } from "@/features/interviews/evaluation-card";
import { CompetencyChart, SessionTrendChart } from "@/features/interviews/progress-charts";
import { useEvaluationSummary, useEvaluations } from "@/lib/api/interviews";
import { formatDateTime } from "@/lib/format";

function EvaluationHistory() {
  const { data, isPending, error, refetch } = useEvaluations();
  if (isPending) return <CardSkeleton lines={4} />;
  if (error) return <ErrorMessage title="Couldn't load feedback history" error={error} onRetry={refetch} />;

  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="history-heading" className="text-base font-semibold">
          Feedback history
        </h2>
        <AiGeneratedBadge />
      </div>
      <ul className="space-y-3">
        {data.results.map((evaluation) => (
          <li key={evaluation.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground">
                  {evaluation.role_title} · Question {evaluation.question_position} ·{" "}
                  {formatDateTime(evaluation.created_at)}
                  {evaluation.input_mode === "voice" ? " · Spoken" : ""}
                </p>
                <p className="font-medium">{evaluation.question_text}</p>
                <p className="text-sm leading-6 text-muted-foreground">{evaluation.summary}</p>
              </div>
              <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
                <Badge>
                  {evaluation.overall_score} / 5 · {SCORE_LABELS[evaluation.overall_score]}
                </Badge>
                <Button asChild variant="link" size="sm">
                  <Link to={`/app/interviews/${evaluation.session_id}`}>Open interview</Link>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {data.count > data.results.length ? (
        <p className="text-sm text-muted-foreground">
          Showing the {data.results.length} most recent of {data.count} evaluations.
        </p>
      ) : null}
    </section>
  );
}

function ProgressPage() {
  const { data, isPending, error, refetch } = useEvaluationSummary();

  return (
    <>
      <DocumentTitle title="Progress" />
      <div className="space-y-6">
        <PageHeader
          title="Progress"
          description="Track how your AI-evaluated interview answers change over time."
        />
        {isPending ? (
          <CardSkeleton lines={6} />
        ) : error ? (
          <ErrorMessage title="Couldn't load your progress" error={error} onRetry={refetch} />
        ) : data.evaluation_count === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No feedback yet"
            description="Complete a mock interview and get AI feedback on your answers to see your progress here."
            action={
              <Button asChild>
                <Link to="/app/interviews/new">Start an interview</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle as="h2">Average score by competency</CardTitle>
                  <CardDescription>
                    Across {data.evaluation_count} evaluated{" "}
                    {data.evaluation_count === 1 ? "answer" : "answers"}, scored 1 to 5.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CompetencyChart competencies={data.competencies} />
                </CardContent>
              </Card>
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle as="h2">Average score per interview</CardTitle>
                  <CardDescription>
                    {data.sessions.length === 1
                      ? "Your one interview with feedback so far."
                      : `Your last ${data.sessions.length} interviews with feedback.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.sessions.length < 2 ? (
                    <p className="text-sm text-muted-foreground">
                      Get feedback in at least two interviews to see a trend.
                    </p>
                  ) : (
                    <SessionTrendChart sessions={data.sessions} />
                  )}
                </CardContent>
              </Card>
            </div>
            <AiDisclaimer kind="scoring" />
            <EvaluationHistory />
          </>
        )}
      </div>
    </>
  );
}

export default ProgressPage;

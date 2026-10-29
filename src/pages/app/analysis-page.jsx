import { ArrowLeft, CheckCircle2, CircleAlert, MessagesSquare, RotateCw } from "lucide-react";
import { Link, useParams } from "react-router";

import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { StatusBadge } from "@/components/feedback/status-badge";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiDisclaimer, AiGeneratedBadge } from "@/features/ai/ai-generated";
import { AiOptionsFields, useAiOptions } from "@/features/ai/ai-options";
import { DownloadButton } from "@/features/reports/download-button";
import { useAccessStatus } from "@/lib/api/ai";
import { reportUrls } from "@/lib/api/dashboard";
import { useAnalysis, useRetryAnalysis } from "@/lib/api/resumes";
import { formatDateTime } from "@/lib/format";

const IMPORTANCE_VARIANT = { high: "destructive", medium: "default", low: "neutral" };

function AnalysisResult({ analysis }) {
  return (
    <div className="space-y-6">
      <Card className="gap-4">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle as="h2">Summary</CardTitle>
            <AiGeneratedBadge />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="leading-7">{analysis.summary}</p>
          <AiDisclaimer model={analysis.ai_model} kind="analysis" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle as="h2">Matched skills ({analysis.matched_skills.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.matched_skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clear matches were found.</p>
            ) : (
              <ul className="space-y-3">
                {analysis.matched_skills.map((item, index) => (
                  <li key={`${index}-${item.skill}`} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <span>
                      <span className="font-medium">{item.skill}</span>
                      <span className="block text-sm text-muted-foreground">{item.evidence}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle as="h2">Skill gaps ({analysis.missing_skills.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.missing_skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No significant gaps were found.</p>
            ) : (
              <ul className="space-y-4">
                {analysis.missing_skills.map((item, index) => (
                  <li key={`${index}-${item.skill}`} className="flex gap-2.5">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {item.skill}
                        <Badge variant={IMPORTANCE_VARIANT[item.importance]}>
                          {item.importance} importance
                        </Badge>
                      </span>
                      <span className="block text-sm text-muted-foreground">{item.suggestion}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle as="h2">Preparation recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 leading-7">
            {analysis.recommendations.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle as="h2">Likely interview questions</CardTitle>
          <Button asChild size="sm">
            <Link to={`/app/interviews/new?jobProfile=${analysis.job_profile.id}&resume=${analysis.resume.id}`}>
              <MessagesSquare aria-hidden="true" />
              Practise in a mock interview
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {analysis.questions.map((item, index) => (
              <li key={`${index}-${item.question}`} className="rounded-md border border-border p-4">
                <p className="font-medium">
                  <span className="text-muted-foreground">{index + 1}. </span>
                  {item.question}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{item.focus}:</span> {item.reason}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisPage() {
  const { analysisId } = useParams();
  const { data: analysis, isPending, error, refetch } = useAnalysis(analysisId);
  const retry = useRetryAnalysis(analysisId);
  const access = useAccessStatus();
  const aiOptions = useAiOptions(access.data);

  const runAgain = () => {
    const options = aiOptions.validate();
    if (options) retry.mutate(options);
  };

  if (isPending) return <CardSkeleton lines={6} />;
  if (error) {
    return <ErrorMessage title="Couldn't load this analysis" error={error} onRetry={refetch} />;
  }

  const company = analysis.job_profile.company ? ` · ${analysis.job_profile.company}` : "";

  return (
    <>
      <DocumentTitle title={`Analysis: ${analysis.job_profile.title}`} />
      <div className="space-y-6">
        <Button asChild variant="link" className="px-0">
          <Link to="/app/analyses">
            <ArrowLeft aria-hidden="true" />
            All analyses
          </Link>
        </Button>
        <PageHeader
          title={`${analysis.job_profile.title}${company}`}
          description={`${analysis.resume.original_filename} · ${formatDateTime(analysis.created_at)}`}
          actions={
            <>
              <StatusBadge status={analysis.status} />
              {analysis.status === "completed" ? (
                <DownloadButton
                  url={reportUrls.analysis(analysis.id)}
                  filename={`prepwise-analysis-${analysis.id}.pdf`}
                >
                  Download report
                </DownloadButton>
              ) : null}
            </>
          }
        />

        {retry.isPending ? (
          <LoadingState className="min-h-60" label="Running the analysis again" />
        ) : analysis.status === "completed" ? (
          <AnalysisResult analysis={analysis} />
        ) : (
          <Alert variant={analysis.status === "failed" ? "destructive" : "info"} role="status">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>
              {analysis.status === "failed"
                ? "This analysis didn't complete"
                : "This analysis was interrupted or is still running"}
            </AlertTitle>
            <AlertDescription>
              <p>
                {analysis.status === "failed"
                  ? analysis.error_message
                  : "If it doesn't finish within a few minutes, you can run it again."}
              </p>
              {retry.error ? <p className="mt-2 font-medium">{retry.error.message}</p> : null}
              {aiOptions.hasAccess ? (
                <div className="mt-3">
                  <AiOptionsFields options={aiOptions} />
                </div>
              ) : null}
              <Button variant="outline" size="sm" className="mt-3" onClick={runAgain}>
                <RotateCw aria-hidden="true" />
                Run again
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}

export default AnalysisPage;

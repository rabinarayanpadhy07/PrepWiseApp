import { Plus, ScanSearch } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { StatusBadge } from "@/components/feedback/status-badge";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useAnalyses } from "@/lib/api/resumes";
import { formatDateTime } from "@/lib/format";

function AnalysesPage() {
  const { data, isPending, error, refetch } = useAnalyses();

  return (
    <>
      <DocumentTitle title="Resume analysis" />
      <div className="space-y-6">
        <PageHeader
          title="Resume analysis"
          description="See how your resume matches a role, which skills are missing, and what to prepare."
          actions={
            <Button asChild>
              <Link to="/app/analyses/new">
                <Plus aria-hidden="true" />
                New analysis
              </Link>
            </Button>
          }
        />
        {isPending ? (
          <CardSkeleton lines={3} />
        ) : error ? (
          <ErrorMessage title="Couldn't load your analyses" error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={ScanSearch}
            title="No analyses yet"
            description="Upload a resume and add a job description to see matched skills, gaps and likely questions."
            action={
              <Button asChild>
                <Link to="/app/analyses/new">Start your first analysis</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {data.map((analysis) => (
              <li key={analysis.id}>
                <Link
                  to={`/app/analyses/${analysis.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {analysis.job_profile.title}
                      {analysis.job_profile.company ? ` · ${analysis.job_profile.company}` : ""}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {analysis.resume.original_filename} · {formatDateTime(analysis.created_at)}
                    </span>
                  </span>
                  <StatusBadge status={analysis.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default AnalysesPage;

import { MessagesSquare, Mic, Plus, Type } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton } from "@/components/feedback/loading-state";
import { StatusBadge } from "@/components/feedback/status-badge";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInterviews } from "@/lib/api/interviews";
import { formatDateTime } from "@/lib/format";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

function InterviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = FILTERS.some((item) => item.value === searchParams.get("status"))
    ? searchParams.get("status")
    : "all";
  const { data, isPending, error, refetch } = useInterviews({
    status: filter === "all" ? undefined : filter,
  });

  return (
    <>
      <DocumentTitle title="Mock interviews" />
      <div className="space-y-6">
        <PageHeader
          title="Mock interviews"
          description="Practise answering role-specific questions by text or voice, with AI feedback on each answer."
          actions={
            <Button asChild>
              <Link to="/app/interviews/new">
                <Plus aria-hidden="true" />
                Start interview
              </Link>
            </Button>
          }
        />

        <Tabs
          value={filter}
          onValueChange={(value) =>
            setSearchParams(value === "all" ? {} : { status: value }, { replace: true })
          }
        >
          <TabsList aria-label="Filter interviews">
            {FILTERS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isPending ? (
          <CardSkeleton lines={3} />
        ) : error ? (
          <ErrorMessage title="Couldn't load your interviews" error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title={filter === "all" ? "No interviews yet" : "No interviews here"}
            description="Start a mock interview for the role you're preparing for."
            action={
              <Button asChild>
                <Link to="/app/interviews/new">Start interview</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {data.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{session.role_title}</p>
                    <StatusBadge status={session.status} />
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {session.mode === "voice" ? (
                        <Mic className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Type className="size-3.5" aria-hidden="true" />
                      )}
                      {session.mode === "voice" ? "Voice" : "Text"}
                    </span>
                    <span>
                      {session.answered_count} of {session.question_count} answered
                    </span>
                    {session.average_score !== null ? (
                      <span>Average score {session.average_score.toFixed(1)} / 5</span>
                    ) : null}
                    <span>{formatDateTime(session.created_at)}</span>
                  </p>
                </div>
                <Button asChild variant={session.status === "in_progress" ? "default" : "outline"} size="sm">
                  <Link to={`/app/interviews/${session.id}`}>
                    {session.status === "in_progress" ? "Continue" : "Review"}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default InterviewsPage;

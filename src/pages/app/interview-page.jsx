import { ArrowLeft, ArrowRight, Flag, Mic, RotateCw, Type } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { StatusBadge } from "@/components/feedback/status-badge";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AnswerPanel } from "@/features/interviews/answer-panel";
import { EvaluationCard } from "@/features/interviews/evaluation-card";
import { InterviewProgress } from "@/features/interviews/interview-progress";
import { InterviewSummary, QuestionReview } from "@/features/interviews/interview-summary";
import { ReadAloudButton } from "@/features/interviews/read-aloud-button";
import { DownloadButton } from "@/features/reports/download-button";
import { reportUrls } from "@/lib/api/dashboard";
import {
  useCompleteInterview,
  useEvaluateAnswer,
  useInterview,
  useSubmitAnswer,
} from "@/lib/api/interviews";
import { clearDraft } from "@/lib/drafts";
import { newIdempotencyKey } from "@/lib/idempotency";

function QuestionCard({ question, total, children, actions }) {
  return (
    <Card className="gap-5">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Question {question.position} of {total}
            </span>
            <Badge variant="outline">{question.competency_label}</Badge>
          </div>
          {actions}
        </div>
        <h2 className="text-lg leading-8 font-semibold sm:text-xl">{question.text}</h2>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function InterviewPage() {
  const { sessionId } = useParams();
  const { data: session, isPending, error, refetch } = useInterview(sessionId);
  const submit = useSubmitAnswer(sessionId);
  const evaluate = useEvaluateAnswer(sessionId);
  const complete = useCompleteInterview(sessionId);
  const [reviewPosition, setReviewPosition] = useState(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [evaluateErrors, setEvaluateErrors] = useState({});
  const keysRef = useRef({});

  if (isPending) return <CardSkeleton lines={5} />;
  if (error) {
    return <ErrorMessage title="Couldn't load this interview" error={error} onRetry={refetch} />;
  }

  const questions = session.questions;
  const answeredCount = questions.filter((question) => question.answer).length;
  const current = questions.find((question) => question.position === session.current_position);
  const reviewing = questions.find((question) => question.position === reviewPosition);
  const isVoice = session.mode === "voice";
  // Seconds left for the next answer, on the session's own billing mode (server-computed).
  const maxVoiceSeconds = session.max_voice_answer_seconds;

  const requestFeedback = (position) => {
    setEvaluateErrors((errors) => ({ ...errors, [position]: null }));
    evaluate.mutate(position, {
      onError: (evaluationError) =>
        setEvaluateErrors((errors) => ({ ...errors, [position]: evaluationError })),
    });
  };

  const handleSubmit = (values) => {
    const position = current.position;
    // The same key is reused if this answer is retried, so it's never saved twice.
    keysRef.current[position] ??= newIdempotencyKey();
    submit.mutate(
      { position, ...values, idempotencyKey: keysRef.current[position] },
      {
        onSuccess: () => {
          clearDraft(sessionId, position);
          setReviewPosition(position);
          requestFeedback(position);
        },
      },
    );
  };

  const finish = () =>
    complete.mutate(undefined, {
      onSuccess: () => {
        setConfirmFinish(false);
        setReviewPosition(null);
      },
    });

  const header = (
    <>
      <Button asChild variant="link" className="px-0">
        <Link to="/app/interviews">
          <ArrowLeft aria-hidden="true" />
          All interviews
        </Link>
      </Button>
      <PageHeader
        title={session.role_title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {isVoice ? <Mic className="size-4" aria-hidden="true" /> : <Type className="size-4" aria-hidden="true" />}
            {isVoice ? "Voice interview" : "Text interview"} · {session.question_count} questions
          </span>
        }
        actions={
          session.status === "in_progress" ? (
            <Button variant="outline" onClick={() => setConfirmFinish(true)}>
              <Flag aria-hidden="true" />
              Finish interview
            </Button>
          ) : (
            <>
              <StatusBadge status={session.status} />
              <DownloadButton
                url={reportUrls.interview(session.id)}
                filename={`prepwise-interview-${session.id}.pdf`}
              >
                Download report
              </DownloadButton>
            </>
          )
        }
      />
    </>
  );

  if (session.status === "completed") {
    return (
      <>
        <DocumentTitle title={`Interview: ${session.role_title}`} />
        <div className="space-y-6">
          {header}
          <InterviewSummary
            session={session}
            onEvaluate={requestFeedback}
            evaluatingPosition={evaluate.isPending ? evaluate.variables : null}
            evaluateErrors={evaluateErrors}
          />
        </div>
      </>
    );
  }

  let body;
  if (reviewing) {
    const evaluation =
      reviewing.evaluation ?? (evaluate.variables === reviewing.position ? evaluate.data : null);
    const feedbackError = evaluateErrors[reviewing.position];
    const hasNext = session.current_position !== null;
    body = (
      <QuestionCard question={reviewing} total={session.question_count}>
        <div className="space-y-1">
          <p className="text-sm font-semibold">Your answer</p>
          <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
            {reviewing.answer?.text}
          </p>
        </div>
        {evaluation ? (
          <EvaluationCard evaluation={evaluation} />
        ) : feedbackError ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Feedback couldn't be generated</AlertTitle>
            <AlertDescription>
              <p>{feedbackError.message} Your answer is saved.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => requestFeedback(reviewing.position)}
              >
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <LoadingState label="Getting AI feedback on your answer" />
        )}
        <div className="flex flex-wrap gap-2">
          {hasNext ? (
            <Button
              onClick={() => setReviewPosition(null)}
              disabled={evaluate.isPending}
              variant={evaluation ? "default" : "outline"}
            >
              {evaluation ? "Next question" : "Skip feedback for now"}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={finish} isLoading={complete.isPending} disabled={evaluate.isPending}>
              <Flag aria-hidden="true" />
              Finish interview
            </Button>
          )}
        </div>
      </QuestionCard>
    );
  } else if (current) {
    body = (
      <QuestionCard
        question={current}
        total={session.question_count}
        actions={isVoice ? <ReadAloudButton text={current.text} /> : null}
      >
        {isVoice && maxVoiceSeconds <= 0 ? (
          <Alert variant="info" role="status">
            <AlertDescription>
              You've used your voice answer time for now. You can still type your answer.
            </AlertDescription>
          </Alert>
        ) : null}
        <AnswerPanel
          key={current.position}
          sessionId={sessionId}
          question={current}
          mode={isVoice && maxVoiceSeconds > 0 ? "voice" : "text"}
          maxVoiceSeconds={maxVoiceSeconds}
          isSubmitting={submit.isPending}
          error={submit.error}
          onSubmit={handleSubmit}
        />
      </QuestionCard>
    );
  } else {
    body = (
      <Card className="gap-4">
        <CardHeader>
          <h2 className="text-lg font-semibold">You've answered every question</h2>
          <p className="text-sm text-muted-foreground">
            Finish the interview to see your summary and review all feedback.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={finish} isLoading={complete.isPending}>
            <Flag aria-hidden="true" />
            Finish interview
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previous = questions.filter(
    (question) => question.answer && question.position !== reviewPosition,
  );

  return (
    <>
      <DocumentTitle title={`Interview: ${session.role_title}`} />
      <div className="space-y-6">
        {header}
        <InterviewProgress
          answered={answeredCount}
          total={session.question_count}
          currentPosition={reviewing ? reviewing.position : session.current_position}
        />
        {complete.error ? (
          <ErrorMessage title="Couldn't finish the interview" error={complete.error} />
        ) : null}
        {body}

        {previous.length > 0 ? (
          <details className="group rounded-lg border border-border bg-surface">
            <summary className="cursor-pointer list-none rounded-lg p-4 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Previous answers ({previous.length})
            </summary>
            <ol className="space-y-4 p-4 pt-0">
              {previous.map((question) => (
                <QuestionReview
                  key={question.position}
                  question={question}
                  onEvaluate={requestFeedback}
                  evaluatingPosition={evaluate.isPending ? evaluate.variables : null}
                  evaluateError={evaluateErrors[question.position]}
                />
              ))}
            </ol>
          </details>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="Finish this interview?"
        description={
          session.current_position
            ? "Questions you haven't answered will stay unanswered. You can still get feedback on answered questions afterwards."
            : "You'll see your summary and can review all feedback."
        }
        confirmLabel="Finish interview"
        isPending={complete.isPending}
        onConfirm={finish}
      />
    </>
  );
}

export default InterviewPage;

import { CheckCircle2, MessagesSquare, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router";

import { ErrorMessage } from "@/components/feedback/error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EvaluationCard } from "@/features/interviews/evaluation-card";

function averageBy(items, pick) {
  if (items.length === 0) return null;
  return items.reduce((sum, item) => sum + pick(item), 0) / items.length;
}

function competencyAverages(evaluations) {
  const groups = new Map();
  for (const evaluation of evaluations) {
    for (const item of evaluation.competency_scores) {
      const group = groups.get(item.competency) ?? { label: item.label, scores: [] };
      group.scores.push(item.score);
      groups.set(item.competency, group);
    }
  }
  return [...groups.entries()].map(([competency, group]) => ({
    competency,
    label: group.label,
    average: averageBy(group.scores, (score) => score),
  }));
}

/** One question with its answer and feedback (or a way to request feedback). */
function QuestionReview({ question, onEvaluate, evaluatingPosition, evaluateError }) {
  const isEvaluating = evaluatingPosition === question.position;
  return (
    <li className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {question.position}
          </span>
          <Badge variant="outline">{question.competency_label}</Badge>
          {question.answer?.input_mode === "voice" ? <Badge variant="neutral">Spoken</Badge> : null}
        </div>
        <p className="font-medium leading-7">{question.text}</p>
      </div>

      {question.answer ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Your answer</p>
          <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
            {question.answer.text}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not answered.</p>
      )}

      {question.evaluation ? (
        <EvaluationCard evaluation={question.evaluation} />
      ) : question.answer ? (
        <div className="space-y-3">
          {isEvaluating ? null : evaluateError ? (
            <ErrorMessage title="Feedback couldn't be generated" error={evaluateError} />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEvaluate(question.position)}
            isLoading={isEvaluating}
          >
            {isEvaluating ? null : <Sparkles aria-hidden="true" />}
            {isEvaluating ? "Getting feedback…" : "Get AI feedback"}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function InterviewSummary({ session, onEvaluate, evaluatingPosition, evaluateErrors }) {
  const answered = session.questions.filter((question) => question.answer);
  const evaluations = session.questions.map((question) => question.evaluation).filter(Boolean);
  const average = averageBy(evaluations, (evaluation) => evaluation.overall_score);
  const competencies = competencyAverages(evaluations);

  return (
    <div className="space-y-6">
      <Card className="gap-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            <CardTitle as="h2">Interview complete</CardTitle>
          </div>
          <CardDescription>
            You answered {answered.length} of {session.question_count} questions.
            {average !== null
              ? ` Average AI score: ${average.toFixed(1)} / 5 across ${evaluations.length} evaluated ${evaluations.length === 1 ? "answer" : "answers"}.`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {competencies.length > 0 ? (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {competencies.map((item) => {
                const id = `summary-${item.competency}`;
                return (
                  <div key={item.competency} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <dt id={id} className="font-medium">
                        {item.label}
                      </dt>
                      <dd className="text-muted-foreground">{item.average.toFixed(1)} / 5</dd>
                    </div>
                    <Progress value={item.average} max={5} aria-labelledby={id} />
                  </div>
                );
              })}
            </dl>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Scores are AI-generated, approximate, and based only on these answers.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/app/interviews/new">
                <MessagesSquare aria-hidden="true" />
                Start another interview
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/progress">
                <TrendingUp aria-hidden="true" />
                View progress
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="review-heading" className="space-y-3">
        <h2 id="review-heading" className="text-base font-semibold">
          Review your answers
        </h2>
        <ol className="space-y-4">
          {session.questions.map((question) => (
            <QuestionReview
              key={question.position}
              question={question}
              onEvaluate={onEvaluate}
              evaluatingPosition={evaluatingPosition}
              evaluateError={evaluateErrors?.[question.position]}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}

export { InterviewSummary, QuestionReview };

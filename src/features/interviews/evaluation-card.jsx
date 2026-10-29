import { ArrowUpRight, ThumbsUp } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { AiDisclaimer, AiGeneratedBadge } from "@/features/ai/ai-generated";
import { cn } from "@/lib/utils";

const SCORE_LABELS = {
  1: "Needs significant work",
  2: "Developing",
  3: "Adequate",
  4: "Strong",
  5: "Excellent",
};

function ScorePill({ score }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-md bg-primary-subtle px-2.5 py-1 font-semibold text-primary">
      <span className="text-lg">{score}</span>
      <span className="text-xs">/ 5</span>
    </span>
  );
}

/** AI feedback on one answer. Always labelled as AI-generated. */
function EvaluationCard({ evaluation, compact = false, className }) {
  const headingId = `evaluation-${evaluation.id}`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn("space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id={headingId} className="text-base font-semibold">
            Feedback
          </h3>
          <AiGeneratedBadge />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScorePill score={evaluation.overall_score} />
          <span>{SCORE_LABELS[evaluation.overall_score]}</span>
        </p>
      </div>

      <p className="leading-7">{evaluation.summary}</p>

      {evaluation.strengths.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">What went well</h4>
          <ul className="space-y-2">
            {evaluation.strengths.map((strength, index) => (
              <li key={`${index}-${strength}`} className="flex gap-2.5 text-sm leading-6">
                <ThumbsUp className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                {strength}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">How to improve</h4>
        <ul className="space-y-3">
          {evaluation.improvements.map((item, index) => (
            <li key={`${index}-${item.area}`} className="flex gap-2.5 text-sm leading-6">
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="font-medium">{item.area}.</span> {item.explanation}{" "}
                <span className="text-muted-foreground">{item.suggestion}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {!compact ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Rubric scores</h4>
          <dl className="grid gap-3 sm:grid-cols-2">
            {evaluation.competency_scores.map((item) => {
              const labelId = `${headingId}-${item.competency}`;
              return (
                <div key={item.competency} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <dt id={labelId} className="font-medium">
                      {item.label}
                    </dt>
                    <dd className="text-muted-foreground">{item.score} / 5</dd>
                  </div>
                  <Progress value={item.score} max={5} aria-labelledby={labelId} />
                  <p className="text-xs leading-5 text-muted-foreground">{item.rationale}</p>
                </div>
              );
            })}
          </dl>
        </div>
      ) : null}

      <AiDisclaimer model={evaluation.ai_model} />
    </section>
  );
}

export { EvaluationCard, SCORE_LABELS };

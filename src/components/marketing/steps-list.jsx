import { cn } from "@/lib/utils";

function StepsList({ steps, className }) {
  return (
    <ol className={cn("grid gap-4", className)}>
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-4 rounded-lg border border-border bg-surface p-5"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export { StepsList };

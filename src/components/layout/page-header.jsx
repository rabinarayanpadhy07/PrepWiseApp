import { cn } from "@/lib/utils";

function PageHeader({ title, description, actions, eyebrow, className, titleAs: Title = "h1" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-sm font-medium text-primary">{eyebrow}</p> : null}
        <Title className="text-title">{title}</Title>
        {description ? (
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export { PageHeader };

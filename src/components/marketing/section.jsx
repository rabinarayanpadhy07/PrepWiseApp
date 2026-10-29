import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

function Section({ id, tone = "default", className, containerClassName, children, ...props }) {
  return (
    <section
      id={id}
      className={cn(
        "py-14 sm:py-20",
        tone === "surface" && "border-y border-border bg-surface",
        className,
      )}
      {...props}
    >
      <PageContainer className={containerClassName}>{children}</PageContainer>
    </section>
  );
}

function SectionHeading({ id, eyebrow, title, description, align = "left", className }) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className="text-sm font-medium text-primary">{eyebrow}</p> : null}
      <h2 id={id} className="text-title">
        {title}
      </h2>
      {description ? <p className="text-base leading-7 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export { Section, SectionHeading };

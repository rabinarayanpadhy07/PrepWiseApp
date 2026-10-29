import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function CapabilityCard({ capability, headingLevel = "h3" }) {
  const Icon = capability.icon;
  return (
    <Card className="h-full gap-0">
      <CardHeader className="gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-primary-subtle text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <CardTitle as={headingLevel}>{capability.title}</CardTitle>
        <CardDescription>{capability.summary}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export { CapabilityCard };

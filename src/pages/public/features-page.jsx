import { Check } from "lucide-react";
import { Link } from "react-router";

import { DocumentTitle } from "@/components/layout/document-title";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capabilities, capabilityGroups } from "@/content/product";

function FeaturesPage() {
  return (
    <>
      <DocumentTitle
        title="Features"
        description="Resume and job description analysis, text and voice mock interviews, AI answer feedback, progress tracking, downloadable reports, BYOK, and subscription platform AI."
      />
      <PageContainer className="pt-12 sm:pt-16">
        <PageHeader
          eyebrow="Features"
          title="What PrepWise does"
          description="PrepWise is built around one idea: practise for a specific role, using your own resume and that role's job description."
        />
        <nav aria-label="Feature groups" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {capabilityGroups.map((group) => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {group.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageContainer>

      {capabilityGroups.map((group, index) => {
        const items = capabilities.filter((capability) => capability.group === group.id);
        return (
          <Section
            key={group.id}
            id={group.id}
            tone={index % 2 === 0 ? "default" : "surface"}
            aria-labelledby={`${group.id}-heading`}
            className="scroll-mt-16"
          >
            <div className="max-w-2xl space-y-2">
              <h2 id={`${group.id}-heading`} className="text-title">
                {group.title}
              </h2>
              <p className="text-muted-foreground">{group.description}</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {items.map((capability) => {
                const Icon = capability.icon;
                return (
                  <Card key={capability.id} className="gap-4">
                    <CardHeader className="gap-3">
                      <span className="flex size-10 items-center justify-center rounded-md bg-primary-subtle text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <CardTitle>{capability.title}</CardTitle>
                      <CardDescription>{capability.summary}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {capability.details.map((detail) => (
                          <li key={detail} className="flex gap-2.5 text-sm leading-6">
                            <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </Section>
        );
      })}

      <Section>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/register">Create account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/pricing">View pricing</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}

export default FeaturesPage;

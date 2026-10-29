import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";

import { DocumentTitle } from "@/components/layout/document-title";
import { PageContainer } from "@/components/layout/page-container";
import { CapabilityCard } from "@/components/marketing/capability-card";
import { Section, SectionHeading } from "@/components/marketing/section";
import { StepsList } from "@/components/marketing/steps-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capabilities, steps } from "@/content/product";

const sessionOutline = [
  "Analyse your resume against the job description",
  "Answer role-specific questions by text or voice",
  "Review AI feedback on every answer",
  "Track progress and download a report",
];

function LandingPage() {
  const aiAccess = capabilities.filter((item) => item.group === "ai-access");

  return (
    <>
      <DocumentTitle description="PrepWise helps you prepare for job interviews with resume and job description analysis, text and voice mock interviews, and AI-generated feedback." />

      <section className="py-14 sm:py-20" aria-labelledby="hero-heading">
        <PageContainer className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div className="space-y-6">
            <h1 id="hero-heading" className="text-display max-w-xl">
              Interview practice tailored to your resume and the job you want
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              PrepWise compares your resume with a job description, runs text and voice mock
              interviews based on both, and gives you AI-generated feedback on every answer.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register">
                  Create account
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle as="h2">What a practice session covers</CardTitle>
              <CardDescription>Each session follows the same four steps.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {sessionOutline.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </PageContainer>
      </section>

      <Section tone="surface" aria-labelledby="features-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="features-heading"
            eyebrow="Features"
            title="Everything you need to prepare for one role at a time"
            description="Preparation, practice, and review in one place."
          />
          <Button asChild variant="link" className="self-start sm:self-auto">
            <Link to="/features">
              View all features
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability) => (
            <li key={capability.id}>
              <CapabilityCard capability={capability} />
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="how-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="space-y-6">
            <SectionHeading
              id="how-heading"
              eyebrow="How it works"
              title="From job description to practice in five steps"
            />
            <Button asChild variant="outline">
              <Link to="/how-it-works">Read the full walkthrough</Link>
            </Button>
          </div>
          <StepsList steps={steps} />
        </div>
      </Section>

      <Section tone="surface" aria-labelledby="ai-heading">
        <SectionHeading
          id="ai-heading"
          eyebrow="AI access"
          title="Two ways to use PrepWise's AI features"
          description="Use your own AI provider API key, or subscribe to use PrepWise's platform AI."
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {aiAccess.map((capability) => (
            <li key={capability.id}>
              <CapabilityCard capability={capability} />
            </li>
          ))}
        </ul>
        <Button asChild className="mt-8">
          <Link to="/pricing">View pricing</Link>
        </Button>
      </Section>

      <Section aria-labelledby="cta-heading">
        <div className="flex flex-col items-start gap-6 rounded-xl border border-border bg-surface p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-2">
            <h2 id="cta-heading" className="text-heading sm:text-2xl">
              Start preparing for your next interview
            </h2>
            <p className="text-muted-foreground">
              Create an account, add your resume, and choose the role you are preparing for.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/register">Create account</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}

export default LandingPage;

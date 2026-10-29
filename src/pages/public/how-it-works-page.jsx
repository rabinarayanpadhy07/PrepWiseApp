import { Link } from "react-router";

import { DocumentTitle } from "@/components/layout/document-title";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Section, SectionHeading } from "@/components/marketing/section";
import { StepsList } from "@/components/marketing/steps-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { steps } from "@/content/product";

const sessionModes = [
  {
    title: "Text session",
    points: [
      "Questions appear one at a time.",
      "Type and edit your answer before submitting it.",
      "Feedback is shown for each answer.",
    ],
  },
  {
    title: "Voice session",
    points: [
      "Your browser asks for microphone access first.",
      "Answer each question out loud.",
      "Feedback is shown for each answer, as in a text session.",
    ],
  },
];

function HowItWorksPage() {
  return (
    <>
      <DocumentTitle
        title="How it works"
        description="How PrepWise works: add your resume and a job description, choose BYOK or platform AI, practise a mock interview, and review feedback."
      />
      <PageContainer className="pt-12 sm:pt-16">
        <PageHeader
          eyebrow="How it works"
          title="How PrepWise works"
          description="Each practice session is built from two inputs: your resume and the job description for the role you want."
        />
      </PageContainer>

      <Section aria-labelledby="steps-heading" className="pt-10 sm:pt-12">
        <h2 id="steps-heading" className="sr-only">
          Steps
        </h2>
        <StepsList steps={steps} className="max-w-3xl" />
      </Section>

      <Section tone="surface" aria-labelledby="modes-heading">
        <SectionHeading
          id="modes-heading"
          title="Text or voice"
          description="Both session types use questions generated from your resume and the job description."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {sessionModes.map((mode) => (
            <Card key={mode.title} className="gap-4">
              <CardHeader>
                <CardTitle>{mode.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6 marker:text-primary">
                  {mode.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section aria-labelledby="ai-choice-heading">
        <SectionHeading
          id="ai-choice-heading"
          title="Choosing BYOK or platform AI"
          description="With BYOK, AI requests run on your own provider API key and your provider bills you directly. With a subscription, PrepWise's platform AI is used and you don't need a key."
        />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/pricing">View pricing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/features#ai-access">Compare options</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}

export default HowItWorksPage;

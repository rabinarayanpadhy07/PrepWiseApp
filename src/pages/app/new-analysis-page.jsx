import { ArrowLeft, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiAccessCard } from "@/features/ai/ai-access-card";
import { AiOptionsFields, useAiOptions } from "@/features/ai/ai-options";
import { JobProfileForm } from "@/features/resumes/job-profile-form";
import { RecordSelect } from "@/features/resumes/record-select";
import { ResumeUpload } from "@/features/resumes/resume-upload";
import { useAccessStatus } from "@/lib/api/ai";
import { useCreateAnalysis, useJobProfiles, useResumes } from "@/lib/api/resumes";
import { formatDate } from "@/lib/format";
import { useIdempotencyKey } from "@/lib/idempotency";

function StepCard({ step, title, description, children }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <p className="text-sm font-medium text-primary">Step {step}</p>
        <CardTitle as="h2">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function NewAnalysisPage() {
  const navigate = useNavigate();
  const resumes = useResumes();
  const profiles = useJobProfiles();
  const createAnalysis = useCreateAnalysis();
  const access = useAccessStatus();
  const aiOptions = useAiOptions(access.data);
  const requestKey = useIdempotencyKey();
  const [resumeId, setResumeId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [errors, setErrors] = useState({});

  // Default to the newest records once they load, unless the user picked something.
  const selectedResume = resumeId || (resumes.data?.[0] ? String(resumes.data[0].id) : "");
  const selectedProfile = profileId || (profiles.data?.[0] ? String(profiles.data[0].id) : "");
  const noResumes = resumes.data?.length === 0;
  const noProfiles = profiles.data?.length === 0;

  const handleRun = () => {
    const nextErrors = {
      resume: selectedResume ? null : "Choose or upload a resume.",
      profile: selectedProfile ? null : "Choose or add a job description.",
    };
    setErrors(nextErrors);
    const options = aiOptions.validate();
    if (nextErrors.resume || nextErrors.profile || !options) return;
    createAnalysis.mutate(
      {
        resumeId: Number(selectedResume),
        jobProfileId: Number(selectedProfile),
        aiOptions: options,
        idempotencyKey: requestKey.current,
      },
      {
        onSuccess: (analysis) => navigate(`/app/analyses/${analysis.id}`),
        onError: requestKey.rotateAfter,
      },
    );
  };

  if (createAnalysis.isPending) {
    return (
      <>
        <DocumentTitle title="Analysing" />
        <LoadingState
          className="min-h-80"
          label="Analysing your resume against the job description. This usually takes under two minutes"
        />
      </>
    );
  }

  return (
    <>
      <DocumentTitle title="New analysis" />
      <div className="space-y-6">
        <Button asChild variant="link" className="px-0">
          <Link to="/app/analyses">
            <ArrowLeft aria-hidden="true" />
            All analyses
          </Link>
        </Button>
        <PageHeader
          title="New resume analysis"
          description="Choose a resume and a job description. The AI compares them and suggests what to prepare."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <StepCard step={1} title="Resume">
            {resumes.isPending ? (
              <CardSkeleton lines={1} className="border-0 p-0" />
            ) : resumes.error ? (
              <ErrorMessage error={resumes.error} onRetry={resumes.refetch} />
            ) : (
              <>
                {!noResumes ? (
                  <RecordSelect
                    id="resume"
                    label="Resume"
                    placeholder="Choose a resume"
                    items={resumes.data}
                    value={selectedResume}
                    onChange={setResumeId}
                    error={errors.resume}
                    getLabel={(resume) => `${resume.original_filename} (${formatDate(resume.created_at)})`}
                  />
                ) : null}
                {noResumes || showUpload ? (
                  <ResumeUpload
                    onUploaded={(resume) => {
                      setResumeId(String(resume.id));
                      setShowUpload(false);
                    }}
                  />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
                    Upload a different resume
                  </Button>
                )}
              </>
            )}
          </StepCard>

          <StepCard step={2} title="Job description">
            {profiles.isPending ? (
              <CardSkeleton lines={1} className="border-0 p-0" />
            ) : profiles.error ? (
              <ErrorMessage error={profiles.error} onRetry={profiles.refetch} />
            ) : (
              <>
                {!noProfiles ? (
                  <RecordSelect
                    id="job-profile"
                    label="Job description"
                    placeholder="Choose a job description"
                    items={profiles.data}
                    value={selectedProfile}
                    onChange={setProfileId}
                    error={errors.profile}
                    getLabel={(profile) =>
                      profile.company ? `${profile.title} · ${profile.company}` : profile.title
                    }
                  />
                ) : null}
                {noProfiles || showProfileForm ? (
                  <JobProfileForm
                    submitLabel="Save and use this job"
                    onSaved={(profile) => {
                      setProfileId(String(profile.id));
                      setShowProfileForm(false);
                    }}
                    onCancel={noProfiles ? undefined : () => setShowProfileForm(false)}
                  />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowProfileForm(true)}>
                    Add a new job description
                  </Button>
                )}
              </>
            )}
          </StepCard>
        </div>

        {access.isPending ? (
          <CardSkeleton lines={2} />
        ) : access.error ? (
          <ErrorMessage title="Couldn't load AI access" error={access.error} onRetry={access.refetch} />
        ) : aiOptions.hasAccess ? (
          <StepCard step={3} title="AI">
            <AiOptionsFields options={aiOptions} />
          </StepCard>
        ) : (
          <AiAccessCard />
        )}

        {createAnalysis.error ? (
          <ErrorMessage
            title="The analysis couldn't be completed"
            error={createAnalysis.error}
            onRetry={handleRun}
          />
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            size="lg"
            onClick={handleRun}
            disabled={noResumes || noProfiles || !aiOptions.hasAccess}
          >
            <Sparkles aria-hidden="true" />
            Run analysis
          </Button>
        </div>
      </div>
    </>
  );
}

export default NewAnalysisPage;

import { ArrowLeft, Mic, Play, Type } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { FormField } from "@/components/forms/form-field";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiAccessCard } from "@/features/ai/ai-access-card";
import { AiOptionsFields, useAiOptions } from "@/features/ai/ai-options";
import { useIdempotencyKey } from "@/lib/idempotency";
import { isVoiceSupported } from "@/features/interviews/use-speech-recognition";
import { useAccessStatus } from "@/lib/api/ai";
import { useStartInterview } from "@/lib/api/interviews";
import { useJobProfiles, useResumes } from "@/lib/api/resumes";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const NONE = "none";
const QUESTION_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10];

function OptionalSelect({ id, label, description, value, onChange, items, getLabel, noneLabel }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-describedby={description ? `${id}-description` : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{noneLabel}</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.id} value={String(item.id)}>
              {getLabel(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? (
        <p id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ModeOption({ value, current, onChange, icon: Icon, title, description, disabled }) {
  const id = useId();
  const checked = current === value;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        checked ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:bg-muted",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        id={id}
        type="radio"
        name="mode"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1 size-4 accent-primary"
      />
      <span className="space-y-1">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4" aria-hidden="true" />
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function NewInterviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const access = useAccessStatus();
  const profiles = useJobProfiles();
  const resumes = useResumes();
  const start = useStartInterview();
  const voiceSupported = isVoiceSupported();

  const [jobProfileId, setJobProfileId] = useState(searchParams.get("jobProfile") || NONE);
  const [resumeId, setResumeId] = useState(searchParams.get("resume") || NONE);
  const [roleTitle, setRoleTitle] = useState("");
  const [mode, setMode] = useState("text");
  const [questionCount, setQuestionCount] = useState("5");
  const [roleError, setRoleError] = useState(null);

  const aiOptions = useAiOptions(access.data);
  const requestKey = useIdempotencyKey();

  const selectedProfile = profiles.data?.find((profile) => String(profile.id) === jobProfileId);
  const noAccess = access.data && !aiOptions.hasAccess;
  const voice = access.data?.voice;
  const voiceRemaining =
    aiOptions.billingMode === "byok"
      ? voice?.byok_remaining_seconds ?? 0
      : voice?.platform_remaining_seconds ?? 0;

  // Never switch the answer format on the user's behalf.
  const voiceBlocked = mode === "voice" && voiceRemaining <= 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedProfile && !roleTitle.trim()) {
      setRoleError("Enter a role, or choose a saved job description.");
      return;
    }
    setRoleError(null);
    const options = aiOptions.validate();
    if (!options || voiceBlocked) return;
    start.mutate(
      {
        roleTitle: roleTitle.trim(),
        jobProfileId: selectedProfile ? selectedProfile.id : null,
        resumeId: resumeId === NONE ? null : Number(resumeId),
        mode,
        questionCount: Number(questionCount),
        aiOptions: options,
        idempotencyKey: requestKey.current,
      },
      {
        onSuccess: (session) => navigate(`/app/interviews/${session.id}`),
        onError: requestKey.rotateAfter,
      },
    );
  };

  if (start.isPending) {
    return (
      <>
        <DocumentTitle title="Preparing interview" />
        <LoadingState className="min-h-80" label="Preparing your interview questions. This can take up to a minute" />
      </>
    );
  }

  const loading = profiles.isPending || resumes.isPending || access.isPending;

  return (
    <>
      <DocumentTitle title="Start a mock interview" />
      <div className="space-y-6">
        <Button asChild variant="link" className="px-0">
          <Link to="/app/interviews">
            <ArrowLeft aria-hidden="true" />
            All interviews
          </Link>
        </Button>
        <PageHeader
          title="Start a mock interview"
          description="The AI writes questions for your role. Answer each one and get feedback as you go."
        />

        {noAccess ? <AiAccessCard /> : null}

        {loading ? (
          <CardSkeleton lines={5} />
        ) : profiles.error || resumes.error ? (
          <ErrorMessage
            error={profiles.error || resumes.error}
            onRetry={() => {
              profiles.refetch();
              resumes.refetch();
            }}
          />
        ) : (
          <Card>
            <CardContent>
              <form noValidate onSubmit={handleSubmit} className="grid gap-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <OptionalSelect
                    id="job-profile"
                    label="Job description (recommended)"
                    description="Questions are tailored to the posting."
                    value={jobProfileId}
                    onChange={setJobProfileId}
                    items={profiles.data}
                    noneLabel="None, I'll enter a role"
                    getLabel={(profile) =>
                      profile.company ? `${profile.title} · ${profile.company}` : profile.title
                    }
                  />
                  <FormField
                    id="role-title"
                    label={selectedProfile ? "Role (optional)" : "Role"}
                    description={
                      selectedProfile
                        ? `Leave empty to use "${selectedProfile.title}".`
                        : "For example: Data analyst, Product manager."
                    }
                    error={roleError}
                  >
                    {(fieldProps) => (
                      <Input
                        maxLength={150}
                        value={roleTitle}
                        onChange={(event) => setRoleTitle(event.target.value)}
                        placeholder={selectedProfile?.title}
                        {...fieldProps}
                      />
                    )}
                  </FormField>
                  <OptionalSelect
                    id="resume"
                    label="Resume (optional)"
                    description="Lets questions refer to your experience."
                    value={resumeId}
                    onChange={setResumeId}
                    items={resumes.data}
                    noneLabel="Don't use a resume"
                    getLabel={(resume) => resume.original_filename}
                  />
                  <div className="grid gap-2">
                    <Label htmlFor="question-count">Number of questions</Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger id="question-count">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_COUNTS.map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {count} questions
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <fieldset className="grid gap-3">
                  <legend className="mb-1 text-sm font-medium">How will you answer?</legend>
                  <div className="grid gap-3 md:grid-cols-2">
                    <ModeOption
                      value="text"
                      current={mode}
                      onChange={setMode}
                      icon={Type}
                      title="Text"
                      description="Type your answers."
                    />
                    <ModeOption
                      value="voice"
                      current={mode}
                      onChange={setMode}
                      icon={Mic}
                      title="Voice"
                      disabled={!voiceSupported || voiceRemaining <= 0}
                      description={
                        !voiceSupported
                          ? "Not supported in this browser. Use Chrome, Edge or Safari."
                          : voiceRemaining <= 0
                            ? "No voice answer time left right now."
                            : `Speak your answers; your browser transcribes them. ${formatDuration(voiceRemaining)} of voice time left.`
                      }
                    />
                  </div>
                  {voiceBlocked ? (
                    <p className="text-sm text-destructive-text" role="alert">
                      There's no voice answer time left for this billing choice. Choose text
                      answers or a different way to pay.
                    </p>
                  ) : null}
                </fieldset>

                <AiOptionsFields options={aiOptions} />

                {start.error ? (
                  <ErrorMessage title="The interview couldn't be started" error={start.error} />
                ) : null}

                <div>
                  <Button type="submit" size="lg" disabled={noAccess}>
                    <Play aria-hidden="true" />
                    Start interview
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

export default NewInterviewPage;

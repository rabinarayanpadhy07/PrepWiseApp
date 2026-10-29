import { Briefcase, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { CardSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobProfileForm } from "@/features/resumes/job-profile-form";
import { ResumeUpload } from "@/features/resumes/resume-upload";
import {
  useDeleteJobProfile,
  useDeleteResume,
  useJobProfiles,
  useResume,
  useResumes,
} from "@/lib/api/resumes";
import { formatBytes, formatDate, pluralize } from "@/lib/format";

function ExtractedTextDialog({ resumeId, onOpenChange }) {
  const { data, isPending, error, refetch } = useResume(resumeId, { enabled: Boolean(resumeId) });
  return (
    <Dialog open={Boolean(resumeId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extracted text</DialogTitle>
          <DialogDescription>
            This is exactly what PrepWise read from {data?.original_filename ?? "your file"} and
            what the AI sees. If something is missing, re-export the file and upload it again.
          </DialogDescription>
        </DialogHeader>
        {isPending ? (
          <LoadingState label="Loading text" />
        ) : error ? (
          <ErrorMessage error={error} onRetry={refetch} />
        ) : (
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted p-4 font-sans text-sm leading-6 whitespace-pre-wrap">
            {data.extracted_text}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResumesTab() {
  const { data, isPending, error, refetch } = useResumes();
  const remove = useDeleteResume();
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="h-fit gap-4">
        <CardHeader>
          <CardTitle as="h2">Upload a resume</CardTitle>
          <CardDescription>We read the text so the AI can compare it with a role.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUpload />
        </CardContent>
      </Card>

      <section aria-labelledby="your-resumes" className="space-y-3">
        <h2 id="your-resumes" className="text-base font-semibold">
          Your resumes
        </h2>
        {isPending ? (
          <CardSkeleton lines={2} />
        ) : error ? (
          <ErrorMessage error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState icon={FileText} title="No resumes yet" description="Upload a PDF or DOCX to get started." />
        ) : (
          <ul className="space-y-3">
            {data.map((resume) => (
              <li
                key={resume.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{resume.original_filename}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{resume.file_type.toUpperCase()}</Badge>
                    {resume.page_count ? <span>{pluralize(resume.page_count, "page")}</span> : null}
                    <span>{formatBytes(resume.size_bytes)}</span>
                    <span>Uploaded {formatDate(resume.created_at)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewing(resume.id)}>
                    <Eye aria-hidden="true" />
                    View text
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${resume.original_filename}`}
                    onClick={() => setDeleting(resume)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ExtractedTextDialog resumeId={viewing} onOpenChange={(open) => !open && setViewing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this resume?"
        description={`${deleting?.original_filename ?? "This resume"} and the analyses that use it will be permanently deleted.`}
        confirmLabel="Delete resume"
        destructive
        isPending={remove.isPending}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
      {remove.error ? <ErrorMessage title="Couldn't delete the resume" error={remove.error} /> : null}
    </div>
  );
}

function JobProfilesTab() {
  const { data, isPending, error, refetch } = useJobProfiles();
  const remove = useDeleteJobProfile();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="h-fit gap-4">
        <CardHeader>
          <CardTitle as="h2">Add a job description</CardTitle>
          <CardDescription>Save roles you're applying for to analyse and practise against.</CardDescription>
        </CardHeader>
        <CardContent>
          <JobProfileForm key={formKey} onSaved={() => setFormKey((key) => key + 1)} />
        </CardContent>
      </Card>

      <section aria-labelledby="saved-jobs" className="space-y-3">
        <h2 id="saved-jobs" className="text-base font-semibold">
          Saved job descriptions
        </h2>
        {isPending ? (
          <CardSkeleton lines={2} />
        ) : error ? (
          <ErrorMessage error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No job descriptions yet"
            description="Paste a job posting to compare it with your resume."
          />
        ) : (
          <ul className="space-y-3">
            {data.map((profile) => (
              <li key={profile.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{profile.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {[profile.company, `Saved ${formatDate(profile.created_at)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {profile.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(profile)}>
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${profile.title}`}
                      onClick={() => setDeleting(profile)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit job description</DialogTitle>
            <DialogDescription>Changes apply to future analyses and interviews.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <JobProfileForm
              profile={editing}
              submitLabel="Save changes"
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this job description?"
        description="Analyses that use it will also be deleted. Past interviews are kept."
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}

function ResumesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "jobs" ? "jobs" : "resumes";

  return (
    <>
      <DocumentTitle title="Resumes & jobs" />
      <div className="space-y-6">
        <PageHeader
          title="Resumes & job descriptions"
          description="Manage the resumes and roles you use for analysis and mock interviews."
        />
        <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
          <TabsList>
            <TabsTrigger value="resumes">Resumes</TabsTrigger>
            <TabsTrigger value="jobs">Job descriptions</TabsTrigger>
          </TabsList>
          <TabsContent value="resumes" className="mt-6">
            <ResumesTab />
          </TabsContent>
          <TabsContent value="jobs" className="mt-6">
            <JobProfilesTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default ResumesPage;

import { CheckCircle2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { ErrorMessage, FieldError } from "@/components/feedback/error-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MAX_RESUME_BYTES, RESUME_EXTENSIONS, useUploadResume } from "@/lib/api/resumes";
import { formatBytes } from "@/lib/format";

/** Quick checks before upload. The server validates the file's real contents again. */
export function validateResumeFile(file) {
  if (!file) return "Choose a PDF or DOCX file.";
  const name = file.name.toLowerCase();
  if (!RESUME_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return "Upload a PDF or DOCX file.";
  }
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_RESUME_BYTES) {
    return `The file must be ${formatBytes(MAX_RESUME_BYTES)} or smaller.`;
  }
  return null;
}

function ResumeUpload({ onUploaded }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [clientError, setClientError] = useState(null);
  const [progress, setProgress] = useState(0);
  const upload = useUploadResume();

  const serverFileError = upload.error?.details?.file?.join(" ");

  const handleChange = (event) => {
    const selected = event.target.files?.[0] ?? null;
    upload.reset();
    setProgress(0);
    setFile(selected);
    setClientError(selected ? validateResumeFile(selected) : null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const error = validateResumeFile(file);
    setClientError(error);
    if (error) return;
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: (resume) => {
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
          onUploaded?.(resume);
        },
      },
    );
  };

  const fieldError = clientError || serverFileError;
  const uploading = upload.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={inputId}>Resume file</Label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleChange}
          disabled={uploading}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={`${inputId}-help${fieldError ? ` ${inputId}-error` : ""}`}
          className="block w-full rounded-md border border-input bg-surface text-sm text-foreground file:mr-3 file:h-10 file:border-0 file:border-r file:border-border file:bg-muted file:px-4 file:text-sm file:font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        />
        <p id={`${inputId}-help`} className="text-sm text-muted-foreground">
          PDF or DOCX, up to {formatBytes(MAX_RESUME_BYTES)}. Scanned (image-only) PDFs can't be
          read. Only the extracted text is kept; the file itself isn't stored.
        </p>
        <FieldError id={`${inputId}-error`}>{fieldError}</FieldError>
      </div>

      {uploading ? (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span id={`${inputId}-progress`}>
              {progress < 100 ? "Uploading…" : "Reading your resume…"}
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} aria-labelledby={`${inputId}-progress`} />
        </div>
      ) : null}

      {upload.error && !serverFileError ? (
        <ErrorMessage title="Upload failed" error={upload.error} />
      ) : null}

      {upload.isSuccess ? (
        <Alert variant="success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Uploaded {upload.data.original_filename}. We extracted{" "}
            {upload.data.text_length.toLocaleString("en-IN")} characters of text.
          </AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" isLoading={uploading} disabled={!file}>
          {uploading ? null : <Upload aria-hidden="true" />}
          Upload resume
        </Button>
      </div>
    </form>
  );
}

export { ResumeUpload };

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { FormError } from "@/components/feedback/form-alerts";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSaveJobProfile } from "@/lib/api/resumes";
import { applyServerErrors } from "@/lib/form-errors";

export const jobProfileSchema = z.object({
  title: z.string().trim().min(1, "Enter the job title.").max(150, "Use 150 characters or fewer."),
  company: z.string().trim().max(150, "Use 150 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(50, "Paste the full job description (at least 50 characters).")
    .max(20000, "The job description must be 20,000 characters or fewer."),
});

const SERVER_FIELDS = { title: "title", company: "company", description: "description" };

function JobProfileForm({ profile, onSaved, onCancel, submitLabel = "Save job description" }) {
  const save = useSaveJobProfile();
  const [formErrors, setFormErrors] = useState([]);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobProfileSchema),
    defaultValues: {
      title: profile?.title ?? "",
      company: profile?.company ?? "",
      description: profile?.description ?? "",
    },
  });
  const idPrefix = profile ? `job-${profile.id}` : "job-new";
  const descriptionLength = useWatch({ control, name: "description" }).length;

  const onSubmit = (values) => {
    setFormErrors([]);
    save.mutate(
      { id: profile?.id, ...values },
      {
        onSuccess: (saved) => onSaved?.(saved),
        onError: (error) => setFormErrors(applyServerErrors(error, setError, SERVER_FIELDS)),
      },
    );
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <FormError messages={formErrors} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}-title`} label="Job title" error={errors.title?.message}>
          {(fieldProps) => <Input {...fieldProps} {...register("title")} />}
        </FormField>
        <FormField
          id={`${idPrefix}-company`}
          label="Company (optional)"
          error={errors.company?.message}
        >
          {(fieldProps) => <Input autoComplete="organization" {...fieldProps} {...register("company")} />}
        </FormField>
      </div>
      <FormField
        id={`${idPrefix}-description`}
        label="Job description"
        description={`Paste the full posting, including requirements. ${descriptionLength.toLocaleString("en-IN")} / 20,000 characters.`}
        error={errors.description?.message}
      >
        {(fieldProps) => <Textarea rows={8} {...fieldProps} {...register("description")} />}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={save.isPending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export { JobProfileForm };

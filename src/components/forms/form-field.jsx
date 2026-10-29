import { FieldError } from "@/components/feedback/error-message";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Labels a form control and wires up accessible description and error text.
 * `children` is a render function that receives the aria/id props for the control:
 *
 *   <FormField id="email" label="Email" error={errors.email?.message}>
 *     {(controlProps) => <Input {...controlProps} {...register("email")} />}
 *   </FormField>
 */
function FormField({ id, label, description, error, className, children }) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export { FormField };

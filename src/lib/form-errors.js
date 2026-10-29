/**
 * Copies backend validation errors ({ details: { field: [messages] } }) onto a
 * React Hook Form instance. `fieldMap` maps API field names to form field names
 * (e.g. { full_name: "fullName" }). Returns the messages that weren't tied to a
 * known form field, so the caller can show them as a form-level error.
 */
export function applyServerErrors(error, setError, fieldMap = {}) {
  const details = error?.code === "validation_error" ? error.details : null;
  if (!details) return [error?.message ?? "Something went wrong. Please try again."];

  const unmatched = [];
  for (const [apiField, messages] of Object.entries(details)) {
    const list = Array.isArray(messages) ? messages : [String(messages)];
    const formField = fieldMap[apiField];
    if (formField) {
      setError(formField, { type: "server", message: list.join(" ") });
    } else {
      unmatched.push(...list);
    }
  }
  return unmatched;
}

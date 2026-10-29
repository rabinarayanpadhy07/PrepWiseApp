import { AlertCircle, Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

/** Form-level error (not tied to one field), announced to screen readers. */
function FormError({ messages }) {
  const list = (Array.isArray(messages) ? messages : [messages]).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <Alert variant="destructive" role="alert" className="mb-5">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>
        {list.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}

function FormNotice({ children }) {
  return (
    <Alert variant="info" role="status" className="mb-5">
      <Info aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export { FormError, FormNotice };

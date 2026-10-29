import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { FormError } from "@/components/feedback/form-alerts";
import { useAuth } from "@/features/auth/auth-provider";
import { toApiError } from "@/lib/api/client";
import { fetchAuthProviders, signInWithGoogle } from "@/lib/api/auth";

const GSI_SCRIPT = "https://accounts.google.com/gsi/client";
let scriptPromise = null;

/** Load Google Identity Services once per page. */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SCRIPT;
      script.async = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Google sign-in couldn't load."));
      };
      document.head.append(script);
    });
  }
  return scriptPromise;
}

/**
 * "Continue with Google". Rendered only when the server has a Google client ID.
 * Google returns a signed ID token; the server verifies it and starts the
 * session, so nothing from the browser is trusted on its own.
 */
function GoogleSignIn({ onSession, text = "continue_with" }) {
  const { startSession } = useAuth();
  const container = useRef(null);
  const [loadError, setLoadError] = useState(null);
  const providers = useQuery({
    queryKey: ["auth", "providers"],
    queryFn: fetchAuthProviders,
    staleTime: Infinity,
    retry: false,
  });
  const clientId = providers.data?.google_client_id;

  const mutation = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: (session) => {
      startSession(session);
      onSession?.(session);
    },
  });
  const { mutate } = mutation;

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        if (cancelled || !container.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => mutate(response.credential),
          ux_mode: "popup",
        });
        google.accounts.id.renderButton(container.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text,
          logo_alignment: "center",
          width: Math.min(400, container.current.offsetWidth || 320),
        });
      })
      .catch((error) => !cancelled && setLoadError(error.message));
    return () => {
      cancelled = true;
    };
  }, [clientId, text, mutate]);

  if (!clientId) return null;

  const errorMessage = mutation.error ? toApiError(mutation.error).message : loadError;
  return (
    <div className="grid gap-4">
      <FormError messages={errorMessage ? [errorMessage] : []} />
      <div
        ref={container}
        className="flex min-h-11 w-full justify-center"
        aria-busy={mutation.isPending}
        data-testid="google-sign-in"
      />
      {mutation.isPending ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Signing you in with Google...
        </p>
      ) : null}
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

export { GoogleSignIn };

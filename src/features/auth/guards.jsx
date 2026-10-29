import { ShieldAlert } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

function FullPageSpinner({ label = "Checking your session" }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Spinner label={label} />
    </div>
  );
}

/** Renders children only for signed-in users; others go to the login page. */
function RequireAuth({ children }) {
  const { status, expired } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "anonymous") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}`, reason: expired ? "expired" : null }}
      />
    );
  }
  return children;
}

/** Administrator-only content. The API enforces the same rule independently. */
function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Administrator access required"
        description="Your account doesn't have permission to view this page."
        action={
          <Button asChild variant="outline">
            <Link to="/app">Go to dashboard</Link>
          </Button>
        }
      />
    );
  }
  return children;
}

/** Login and registration pages send signed-in users straight to the app. */
function RedirectIfAuthenticated({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "authenticated") {
    return <Navigate to={location.state?.from || "/app"} replace />;
  }
  return children;
}

export { FullPageSpinner, RedirectIfAuthenticated, RequireAdmin, RequireAuth };

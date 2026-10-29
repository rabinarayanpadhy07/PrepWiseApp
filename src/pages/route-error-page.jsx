import { isRouteErrorResponse, Link, useRouteError } from "react-router";

import { ErrorMessage } from "@/components/feedback/error-message";
import { DocumentTitle } from "@/components/layout/document-title";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

// Rendered when a route fails to load or throws while rendering.
function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `The page returned an error (${error.status}).`
    : "This page couldn't be displayed. Reloading usually fixes this.";

  return (
    <>
      <DocumentTitle title="Error" />
      <PageContainer width="narrow" className="py-20">
        <h1 className="text-title mb-6">Something went wrong</h1>
        <ErrorMessage title="Page error" message={message} />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button asChild variant="outline">
            <Link to="/">Go to home page</Link>
          </Button>
        </div>
      </PageContainer>
    </>
  );
}

export default RouteErrorPage;

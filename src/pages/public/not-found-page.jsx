import { Link } from "react-router";

import { DocumentTitle } from "@/components/layout/document-title";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

function NotFoundPage() {
  return (
    <>
      <DocumentTitle title="Page not found" />
      <PageContainer width="narrow" className="py-20 text-center sm:py-28">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="text-title mt-2">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/">Go to home page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">View pricing</Link>
          </Button>
        </div>
      </PageContainer>
    </>
  );
}

export default NotFoundPage;

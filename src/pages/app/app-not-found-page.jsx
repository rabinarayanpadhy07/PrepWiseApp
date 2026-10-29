import { Compass } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { DocumentTitle } from "@/components/layout/document-title";
import { Button } from "@/components/ui/button";

function AppNotFoundPage() {
  return (
    <>
      <DocumentTitle title="Page not found" />
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="This page doesn't exist or may have moved."
        action={
          <Button asChild>
            <Link to="/app">Go to dashboard</Link>
          </Button>
        }
      />
    </>
  );
}

export default AppNotFoundPage;

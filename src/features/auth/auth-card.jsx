import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

function AuthCard({ title, description, footer, children }) {
  return (
    <PageContainer width="narrow" className="flex justify-center py-12 sm:py-16">
      <Card className="w-full max-w-md gap-5">
        <CardHeader>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? (
          <CardFooter className="justify-center border-t border-border pt-5 text-sm text-muted-foreground">
            {footer}
          </CardFooter>
        ) : null}
      </Card>
    </PageContainer>
  );
}

export { AuthCard };

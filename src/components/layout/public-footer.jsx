import { Link } from "react-router";

import { Logo } from "@/components/layout/logo";
import { PageContainer } from "@/components/layout/page-container";

const footerGroups = [
  {
    heading: "Product",
    links: [
      { to: "/features", label: "Features" },
      { to: "/how-it-works", label: "How it works" },
      { to: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Account",
    links: [
      { to: "/login", label: "Log in" },
      { to: "/register", label: "Create account" },
    ],
  },
];

function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <PageContainer className="grid gap-8 py-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-sm leading-6 text-muted-foreground">
            AI-assisted interview preparation built around your resume and the job you want.
          </p>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h2 className="text-sm font-semibold">{group.heading}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="rounded-sm text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </PageContainer>
      <div className="border-t border-border">
        <PageContainer className="py-5 text-sm text-muted-foreground">
          © {new Date().getFullYear()} PrepWise
        </PageContainer>
      </div>
    </footer>
  );
}

export { PublicFooter };

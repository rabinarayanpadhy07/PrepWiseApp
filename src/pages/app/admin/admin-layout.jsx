import { NavLink, Outlet } from "react-router";

import { DocumentTitle } from "@/components/layout/document-title";
import { PageHeader } from "@/components/layout/page-header";
import { RequireAdmin } from "@/features/auth/guards";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { to: "/app/admin", label: "Overview", end: true },
  { to: "/app/admin/users", label: "Users" },
  { to: "/app/admin/subscriptions", label: "Subscriptions" },
  { to: "/app/admin/plans", label: "Plans" },
  { to: "/app/admin/ai", label: "AI configuration" },
  { to: "/app/admin/usage", label: "Usage and costs" },
  { to: "/app/admin/payments", label: "Payments" },
  { to: "/app/admin/health", label: "Provider health" },
  { to: "/app/admin/audit", label: "Audit log" },
];

/** Administration area. The API enforces administrator access on every request too. */
function AdminLayout() {
  return (
    <RequireAdmin>
      <DocumentTitle title="Administration" />
      <div className="space-y-6">
        <PageHeader
          title="Administration"
          description="Every change made here is recorded in the audit log."
        />
        <nav aria-label="Administration sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-1 border-b border-border">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Outlet />
      </div>
    </RequireAdmin>
  );
}

export default AdminLayout;

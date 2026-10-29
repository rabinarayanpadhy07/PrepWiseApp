import { AppSidebar } from "@/components/layout/app-sidebar";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PageContainer } from "@/components/layout/page-container";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/layout/skip-link";

/**
 * Layout for authenticated areas: fixed sidebar on desktop, top bar with a
 * slide-in menu on smaller screens.
 *
 * navItems: [{ to, label, icon, end? }]
 * headerActions: optional content for the right side of the top bar.
 * sidebarFooter: optional content pinned to the bottom of the navigation.
 */
function AppShell({ navItems, homeTo = "/", headerActions, sidebarFooter, children }) {
  return (
    <div className="min-h-dvh bg-background">
      <SkipLink />
      <AppSidebar items={navItems} homeTo={homeTo} footer={sidebarFooter} />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
            <MobileNav items={navItems} homeTo={homeTo} footer={sidebarFooter} />
            <Logo to={homeTo} className="lg:hidden" />
            <div className="ml-auto flex items-center gap-2">{headerActions}</div>
          </div>
        </header>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 py-6 outline-none sm:py-8">
          <PageContainer width="wide">{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}

export { AppShell };

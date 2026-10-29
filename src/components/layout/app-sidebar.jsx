import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

// Fixed desktop sidebar for authenticated areas (hidden below the lg breakpoint).
function AppSidebar({ items, homeTo = "/", footer, className }) {
  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:flex",
        className,
      )}
    >
      <div className="flex h-16 items-center px-5">
        <Logo to={homeTo} />
      </div>
      <SidebarNav items={items} className="flex-1 overflow-y-auto px-3 py-4" />
      {footer ? <div className="border-t border-border p-3">{footer}</div> : null}
    </aside>
  );
}

export { AppSidebar };

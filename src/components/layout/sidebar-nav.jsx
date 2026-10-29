import { NavLink } from "react-router";

import { cn } from "@/lib/utils";

/**
 * Vertical navigation list used by the desktop sidebar and the mobile sheet.
 * items: [{ to, label, icon, end? }]
 */
function SidebarNav({ items, label = "Main", onNavigate, className }) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-col gap-1">
        {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-subtle text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
              <span className="truncate">{itemLabel}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { SidebarNav };

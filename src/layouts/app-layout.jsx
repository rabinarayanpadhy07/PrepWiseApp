import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  ScanSearch,
  Settings,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { RequireAuth } from "@/features/auth/guards";

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/resumes", label: "Resumes & jobs", icon: FileText },
  { to: "/app/analyses", label: "Resume analysis", icon: ScanSearch },
  { to: "/app/interviews", label: "Mock interviews", icon: MessagesSquare },
  { to: "/app/progress", label: "Progress", icon: TrendingUp },
  { to: "/app/billing", label: "Billing", icon: CreditCard },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const ADMIN_ITEM = { to: "/app/admin", label: "Administration", icon: ShieldCheck };

function initials(user) {
  const source = user.full_name || user.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary"
          >
            {initials(user)}
          </span>
          <span className="hidden max-w-40 truncate text-sm sm:inline">
            {user.full_name || user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium text-foreground">{user.full_name}</span>
          <span className="block truncate text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/settings">
            <Settings aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthenticatedShell() {
  const { isAdmin } = useAuth();
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <AppShell navItems={navItems} homeTo="/app" headerActions={<UserMenu />}>
      <Outlet />
    </AppShell>
  );
}

function AppLayout() {
  return (
    <RequireAuth>
      <AuthenticatedShell />
    </RequireAuth>
  );
}

export default AppLayout;

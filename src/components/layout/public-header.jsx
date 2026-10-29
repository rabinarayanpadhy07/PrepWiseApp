import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router";

import { Logo } from "@/components/layout/logo";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

export const publicNavItems = [
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
];

function navLinkClass({ isActive }) {
  return cn(
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
  );
}

function AccountActions({ onNavigate, mobile = false }) {
  const { status } = useAuth();
  if (status === "authenticated") {
    return (
      <Button asChild>
        <Link to="/app" onClick={onNavigate}>
          Open app
        </Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild variant={mobile ? "outline" : "ghost"}>
        <Link to="/login" onClick={onNavigate}>
          Log in
        </Link>
      </Button>
      <Button asChild>
        <Link to="/register" onClick={onNavigate}>
          Create account
        </Link>
      </Button>
    </>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <PageContainer className="flex h-16 items-center gap-4">
        <Logo />

        <nav aria-label="Primary" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {publicNavItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <AccountActions />
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Open menu">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="sr-only">Site navigation</SheetDescription>
            </SheetHeader>
            <nav aria-label="Primary" className="px-3">
              <ul className="flex flex-col gap-1">
                {publicNavItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={close}
                      className={({ isActive }) =>
                        cn(
                          "flex h-11 items-center rounded-md px-3 text-base font-medium",
                          isActive ? "bg-primary-subtle text-primary" : "text-foreground hover:bg-muted",
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-2 grid gap-2 border-t border-border p-4">
              <AccountActions onNavigate={close} mobile />
            </div>
          </SheetContent>
        </Sheet>
      </PageContainer>
    </header>
  );
}

export { PublicHeader };

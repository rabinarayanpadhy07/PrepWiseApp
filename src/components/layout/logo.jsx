import { Link } from "react-router";

import { cn } from "@/lib/utils";

function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M11 23V9h6.2c3 0 5 1.9 5 4.6S20.2 18.2 17.2 18.2H14.6V23H11Zm3.6-7.7h2.4c1.1 0 1.8-.7 1.8-1.7S18.1 12 17 12h-2.4v3.3Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

function Logo({ to = "/", className, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-base font-semibold text-foreground",
        className,
      )}
    >
      <LogoMark />
      <span>PrepWise</span>
      <span className="sr-only">home</span>
    </Link>
  );
}

export { Logo, LogoMark };

import { cn } from "@/lib/utils";

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

// Horizontal gutters: 16px on phones, 24px on tablets, 32px on desktop.
function PageContainer({ as: Comp = "div", width = "default", className, ...props }) {
  return (
    <Comp className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width], className)} {...props} />
  );
}

export { PageContainer };

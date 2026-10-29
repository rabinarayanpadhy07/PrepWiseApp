export const MAIN_CONTENT_ID = "main-content";

function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-md bg-surface px-4 py-2 text-sm font-medium text-primary shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
    >
      Skip to main content
    </a>
  );
}

export { SkipLink };

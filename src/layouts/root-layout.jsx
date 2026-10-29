import { useEffect, useRef } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";

import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";

// Moves keyboard/screen-reader focus to the main region after client-side navigation.
function useFocusMainOnNavigate() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
  }, [pathname]);
}

function RootLayout() {
  useFocusMainOnNavigate();

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

export default RootLayout;
